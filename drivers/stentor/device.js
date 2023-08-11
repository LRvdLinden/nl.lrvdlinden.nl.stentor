'use strict';
const { Device } = require('homey');
const Parser = require('rss-parser');
const fetch = require('node-fetch');

class stentorDevice extends Device {
    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    async onInit() {
        this.log(`[onInit] ${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

        this.triggerNewArticle = this.homey.flow.getDeviceTriggerCard('new_article');

        this.receivedArticleLink = null;
        this.receivedVideoUrls = new Set(); // A Set to keep track of received video links

        this.checkInterval = 5 * 60 * 1000; // 5 minutes
        this.parser = new Parser({
            customFields: {
                item: [
                    ['image', 'customImage1'],
                    ['media:thumbnail', 'customImage2'],
                    ['media:content', 'customImage3'],
                    ['itunes', 'customImage4'],
                    ['itunes:image', 'customImage5'],
                    ['enclosure', 'customImage6'],
                    ['media:group', 'customImage7'],
                    ['media:group.media:thumbnail', 'customImage8']
                ]
            }
        });

        this.customImageArray = ['customImage1', 'customImage2', 'customImage3', 'customImage4', 'customImage5', 'customImage6', 'customImage7', 'customImage8'];

        try {
            const settings = this.getSettings();
            if (settings && settings.feedUrl) {
                this.feedUrl = `https://www.destentor.nl/${settings.feedUrl}/rss.xml`;
                this.log(`[Device] ${this.getName()} - [onInit] - Using feed URL from device settings: ${this.feedUrl}`);

                // Start the RSS feed checking interval
                this.onPollInterval = setInterval(async () => {
                    await this.checkRssFeed();
                }, this.checkInterval);

                await this.checkRssFeed();
            }
        } catch (err) {
            this.error(`[Device] ${this.getName()} - [onInit] - Error in getting device settings:`, err);
        }
    }

    onSettings({ oldSettings, newSettings, changedKeys }) {
        if (changedKeys.includes('feedUrl')) {
            this.feedUrl = `https://www.destentor.nl/${settings.feedUrl}/rss.xml`;
            this.log(`[Device] ${this.getName()} - [onSettings] - Using feed URL from device settings: ${this.feedUrl}`);

            if (this.onPollInterval) {
                clearInterval(this.onPollInterval);
            }

            // Start the RSS feed checking interval
            this.onPollInterval = setInterval(async () => {
                await this.checkRssFeed();
            }, this.checkInterval);

            this.checkRssFeed();
        }
    }

    async setImage(imagePath = null) {
        try {
            if (!this._image) {
                this._imageSet = false;
                this._image = await this.homey.images.createImage();

                this.log(`[setImage] - Registering Device image`);
            }

            await this._image.setStream(async (stream) => {
                this.homey.app.log(`[setImage] - Setting image - `, imagePath);

                let res = await fetch(imagePath);
                return res.body.pipe(stream);
            });

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            return Promise.reject(e);
        }
    }

    async checkRssFeed() {
        try {
            const feedXml = await this.getFeedXml();
            const feed = await this.parser.parseString(feedXml);

            if (feed && feed.items && feed.items.length) {
                let [latestItem] = feed.items;

                this.log(`[Device] ${this.getName()} - [checkRssFeed] - got latestItem:`, latestItem);
                const { title, link, content, pubDate } = latestItem;
                const customImageKey = this.customImageArray.find((key) => latestItem.hasOwnProperty(key)) || '';
                const customImage = customImageKey && latestItem[customImageKey];

                const imageUrl = await this.getImageUrl(customImage) || '';

                await this.setImage(imageUrl);

                const data = {
                    title,
                    link,
                    content,
                    pubDate,
                    imageUrl,
                    image: this._image
                };

                // Check if the new article has a different pubDate from the last triggered article
                if (pubDate !== this.lastTriggeredPubDate) {
                    this.log(`[Device] ${this.getName()} - [checkRssFeed] - trigger new article Data:`, data);
                    await this.triggerNewArticle.trigger(this, data).catch((err) => this.error(`[Device] ${this.getName()} - [checkRssFeed] - Error in triggerNewArticle`, err));

                    // Update the lastTriggeredPubDate with the current pubDate
                    this.lastTriggeredPubDate = pubDate;
                } else {
                    this.log(`[Device] ${this.getName()} - [checkRssFeed] - Article already triggered, skipping...`);
                }
            }
        } catch (err) {
            this.error(`[Device] ${this.getName()} - [checkRssFeed] - Error in retrieving RSS-feed:`, err);
        }
    }

    async getFeedXml() {
        const res = await fetch(this.feedUrl);

        this.log(`[Device] ${this.getName()} - [getFeedXml] - retrieving RSS-feed: ${res.status}`);

        if (res.status === 200) {
            const body = await res.text();
            return body;
        } else {
            throw new Error(`[Device] ${this.getName()} - [getFeedXml] - Error in retrieving RSS-feed: ${res.status}`);
        }
    }

    async getImageUrl(customImage) {
        if (customImage && customImage.url) {
            return await customImage.url;
        } else if (customImage && customImage.$ && customImage.$.url) {
            return await customImage.$.url;
        } else if (customImage && customImage.$ && customImage.$.href) {
            return await customImage.$.href;
        }

        return 'not found';
    }
}

module.exports = stentorDevice;
