const { Homey } = require('homey');

class SettingsPage extends Homey.Page {
  onBeforeSave(settings, oldSettings) {
    // Convert newline-separated URLs to an array
    if (typeof settings.feed_urls === 'string') {
      settings.feed_urls = settings.feed_urls.split('\n').filter(url => url.trim() !== '');
    }

    return settings;
  }

  async onBeforeRender(args) {
    // Load the current feed_urls and pass it to the template
    const feedUrls = await this.homey.settings.get('feed_urls') || [];
    args.feedUrls = feedUrls.join('\n');
    return args;
  }
}

module.exports = SettingsPage;
