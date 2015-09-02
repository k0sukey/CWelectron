var _ = require('lodash'),
	moment = require('moment'),
	path = require('path'),
	remote = require('remote'),
	request = require('request'),
	React = require('react');

var args = {
	token: remote.getCurrentWindow().token,
	roomid: remote.getCurrentWindow().roomid,
	accountid: remote.getCurrentWindow().accountid
};

var Message = React.createClass({
	displayName: 'message',
	getInitialState: function(){
		var styles = {
			content: {
				minHeight: '60px',
				margin: '10px'
			},
			wrapper: {
				width: '100%',
				height: 'auto'
			},
			avatar: {
				display: 'block',
				left: '10px',
				width: '40px',
				height: '40px',
				WebkitBorderRadius: '20px'
			},
			status: {
			},
			name: {
				fontSize: '80%',
				fontWeight: 'bold',
				color: '#f9423a'
			},
			timestamp: {
				margin: '0 0 0 4px',
				fontSize: '80%',
				color: '#8f836d'
			},
			message: {
				wordWrap: 'break-word'
			}
		};

		if (parseInt(args.accountid, 10) === this.props.message.account.account_id) {
			styles.avatar.float = 'right';
			styles.avatar.marginLeft = '10px';
			styles.status.textAlign = 'right';
		} else {
			styles.avatar.float = 'left';
			styles.avatar.marginRight = '10px';
		}

		return {
			styles: styles
		};
	},
	render: function(){
		var content = this.props.message.body.replace(/\[To:\d+\]/g, 'To:')
			.replace(/\[rp\said=\d+\sto=\d+-\d+\]/g , 'Re:')
			.replace(/\[qtmeta\said=\d+\stime=\d+\]/g, '').replace(/\[qtmeta\said=\d+\]/g, '')
			.replace(/\[qt\]/g, '').replace(/\[\/qt\]/g, '')		// ignore
			.replace(/\[code\]/g, '').replace(/\[\/code\]/g, '')	// ignore
			.replace(/\[info\]/g, '').replace(/\[\/info\]/g, '')	// ignore
			.replace(/\[title\]/g, '').replace(/\[\/title\]/g, '')	// ignore
			.replace(/\[task\]/g, '').replace(/\[\/task\]/g, '')	// ignore
			.replace(/\[live\]/g, '').replace(/\[\/live\]/g, '')	// ignore
			.replace(/\[hr\]/g, ''),								// ignore
			timestamp = moment(this.props.message.send_time * 1000).locale('ja').fromNow();

		return (
			<li style={this.state.styles.content} className="clearfix">
				<div style={this.state.styles.wrapper}>
					<p style={this.state.styles.status}>
						<span style={this.state.styles.name}>{this.props.message.account.name}</span>
						<span style={this.state.styles.timestamp}>{timestamp}</span>
					</p>
					<img src={this.props.message.account.avatar_image_url} style={this.state.styles.avatar}/>
					<pre style={this.state.styles.message}>{content}</pre>
				</div>
			</li>
		);
	}
});

var Timeline = React.createClass({
	displayName: 'timeline',
	getInitialState: function(){
		return {
			initial: true,
			messages: []
		};
	},
	componentDidMount: function(){
		var that = this,
			node = React.findDOMNode(this).parentNode,
			shouldScrollBottom = node.scrollTop + node.offsetHeight === node.scrollHeight;

		request.get({
			url: 'https://api.chatwork.com/v1/rooms/' + args.roomid + '/messages?force=1',
			headers: {
				'X-ChatWorkToken': args.token
			}
		}, function(error, response, body){
			if (error) {
				return;
			}

			that.setState({
				messages: JSON.parse(body)
			}, function(){
				var node = React.findDOMNode(that).parentNode;
				if (that.state.initial || shouldScrollBottom) {
					that.state.initial = false;
					node.scrollTop = node.scrollHeight;
				}
			});
		});
	},
	render: function(){
		var avatar = {
			width: '40px',
			height: '40px',
			WebkitBorderRadius: '20px'
		};

		return (
			<ul>{this.state.messages.map(function(message){
				return <Message message={message}/>
			})}</ul>
		);
	}
});

var Textarea = React.createClass({
	displayName: 'textarea',
	getInitialState: function(){
		return {
			message: '',
			placeholder: 'メッセージ内容を入力（Shift＋Enterで送信）',
			shift: false
		};
	},
	doChange: function(e){
		this.setState({
			message: e.target.value
		});
	},
	doKeyDown: function(e){
		if (e.which === 16) {
			this.state.shift = true;
		}
	},
	doKeyPress: function(e){
		var that = this;

		if (e.which === 13 && this.state.shift && that.state.message !== '') {
			request.post({
				url: 'https://api.chatwork.com/v1/rooms/' + args.roomid + '/messages',
				headers: {
					'X-ChatWorkToken': args.token
				},
				form: {
					body: this.state.message
				}
			}, function(error, response, body){
				if (error) {
					return;
				}

				var node = React.findDOMNode(that);
				node.value = '';

				timeline.componentDidMount();
			});
		}
	},
	doKeyUp: function(e){
		if (e.which === 16) {
			this.state.shift = false;
		}
	},
	render: function(){
		return (
			<textarea autoFocus value={this.state.message} placeholder={this.state.placeholder} onChange={this.doChange} onKeyDown={this.doKeyDown} onKeyPress={this.doKeyPress} onKeyUp={this.doKeyUp}/>
		);
	}
});

var timeline = React.render(<Timeline/>, document.querySelector('#timeline'));
React.render(<Textarea/>, document.querySelector('#textarea'));

_.delay(function(){
	setInterval(function(){
		timeline.componentDidMount();
	}, 10000);
}, 5000);