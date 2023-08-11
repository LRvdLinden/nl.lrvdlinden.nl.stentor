'use strict';

const Homey = require('homey');

class homeystentor extends Homey.App {
    
    async onInit() {
        this.log('Youtube is being initialized');
        process.on('uncaughtException', (err) => {
			this.error(`UnCaught exception: ${err}\n`);
		});

		process.on('unhandledRejection', (reason, p) => {
			this.error('Unhandled Rejection at:', p, 'reason:', reason);
		});

		this.homey
		.on('unload', () => {
			this.log('app unload called');
		})
		.on('memwarn', () => {
			this.log('memwarn!');
		})
		.on('cpuwarn', () => {
			this.log('cpu warning');
		});
    }

}

// module.exports.init = homeystentor;
module.exports = homeystentor;
