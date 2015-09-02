var _ = require('lodash'),
	app = require('app'),
	globalShortcut = require('global-shortcut'),
	path = require('path'),
	request = require('request'),
	BrowserWindow = require('browser-window'),
	Menu = require('menu'),
	MenuItem = require('menu-item'),
	Q = require('q'),
	Tray = require('tray'),
	token = require('./package.json').chatwork;

require('crash-reporter').start();

var tray = null,
	menu = null,
	current = null;

function fetch() {
	Q.when().then(function(){
		var d = Q.defer();

		request.get({
			url: 'https://api.chatwork.com/v1/me',
			headers: {
				'X-ChatWorkToken': token
			}
		}, function(error, response, body){
			if (error) {
				d.reject();
			}

			var json;

			try {
				json = JSON.parse(body);
			} catch(e) {
				d.reject(e.message);
			}

			d.resolve(json);
		});

		return d.promise;
	}).then(function(me){
		var d = Q.defer();

		request.get({
			url: 'https://api.chatwork.com/v1/rooms',
			headers: {
				'X-ChatWorkToken': token
			}
		}, function(error, response, body){
			if (error) {
				d.reject();
			}

			var json;

			try {
				json = JSON.parse(body);

				_.each(json, function(item, index){
					menu.append(new MenuItem({
						label: item.name,
						click: function(){
							var window = new BrowserWindow({
								width: 400,
								height: 800,
								title: item.name,
								show: false
							});

							window.token = token;
							window.roomid = item.room_id;
							window.accountid = me.account_id;

							window.on('focus', function(){
								current = window;
							});

							window.on('closed', function(){
								current = null;
								window = null;
							});

							window.loadUrl('file://' + path.join(__dirname, 'app', 'html', 'chat.html'));
							window.show();
						}
					}));
				});
			} catch(e) {
				d.reject(e.message);
			}

			d.resolve();
		});

		return d.promise;
	}).done(function(){
		tray.setContextMenu(menu);
	});
}

app.on('window-all-closed', function(){
});

app.on('ready', function(){
	globalShortcut.register('Command+q', function(){
		if (_.isNull(current)) {
			app.quit();
		} else {
			current.close();
		}
	});

	menu = new Menu();
	menu.append(new MenuItem({
		label: 'Quit',
		click: function(){
			app.quit();
		}
	}));
	menu.append(new MenuItem({
		label: 'Refresh',
		click: function(){
			fetch();
		}
	}));
	menu.append(new MenuItem({
		type: 'separator'
	}));

	tray = new Tray(path.join(__dirname, 'app', 'image', 'tray.png'));
	tray.setToolTip('ChatWork.electron');
	tray.setContextMenu(menu);

	app.dock.hide();

	fetch();
});