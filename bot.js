const needle = require('needle');
const Discord = require('discord.js');
const bot = new Discord.Client();

const config = require('./bits/config.json');
const wikis = require('./bits/wikis.json');
const aliases = require('./bits/aliases.json');
const commands = require('./bits/commands.js');

const sql = require('sqlite');
sql.open('./bits/db.sqlite');

bot.once('ready', () => {
	bot.user.setGame(`with gloop | ${config.prefix}help`);
});

bot.on('message', msg => {
	if (msg.cleanContent.startsWith(config.prefix)) {
		let cmd = msg.cleanContent.split(' ')[0].substring(config.prefix.length);
		let args = msg.cleanContent.split(' ').slice(1);
		if (commands.commands.hasOwnProperty(cmd)) {
			if (commands.commands[cmd].level !== 0) {
				if (commands.commands[cmd].level === 1) {
					if (!authorIsAnyAdmin(msg)) {
						msg.reply('you have to be a server administrator to do this.');
					} else {
						commands.commands[cmd].process(bot, msg, args);
					}
				} else {
					if (!authorIsBotCreator(msg)) {
						msg.reply('only the creator of the bot can do this.');
					} else {
						commands.commands[cmd].process(bot, msg, args);
					}
				}
			} else {
				commands.commands[cmd].process(bot, msg, args);
			}
		} else {
			parseLinks(msg);
		}
	} else {
		parseLinks(msg);
	}
});

const authorIsServerAdmin = msg => {
	return msg.member.hasPermission('MANAGE_GUILD');
};

const authorIsBotCreator = msg => {
	return config.adminID == msg.author.id;
};

const authorIsAnyAdmin = msg => {
	return authorIsServerAdmin(msg) || authorIsBotCreator(msg);
};

const parseLinks = msg => {
	let objArr = [];
	if (/\[\[([^|]*?)\]\]/g.test(msg.cleanContent)) {
		let queries = msg.cleanContent.match(/\[\[([^|]*?)\]\]/g);
		for (let i = 0; i < queries.length; i++) {
			let query = queries[i].replace(/[[\]]{2}/g, '');
			let wiki = parseWikiFromQuery(query);
			query = query.replace(/^.*?:/g, '');
			objArr.push({ 'type': 'search', 'query': query, 'wiki': wiki, 'id': msg.channel.id + '@' + msg.guild.id });
		}
	}

	if (/{{([^|]*?)}}/g.test(msg.cleanContent)) {
		let queries = msg.cleanContent.match(/{{([^|]*?)}}/g);
		for (let i = 0; i < queries.length; i++) {
			let query = queries[i].replace(/[{}]{2}/g, '');
			let wiki = parseWikiFromQuery(query);
			query = query.replace(/^.*?:/g, '');
			objArr.push({ 'type': 'template', 'query': query, 'wiki': wiki, 'id': msg.channel.id + '@' + msg.guild.id });
		}
	}

	if (/--([^|]*?)--/g.test(msg.cleanContent)) {
		let queries = msg.cleanContent.match(/--([^|]*?)--/g);
		for (let i = 0; i < queries.length; i++) {
			let query = queries[i].replace(/-{2}/g, '');
			let wiki = parseWikiFromQuery(query);
			query = query.replace(/^.*?:/g, '');
			objArr.push({ 'type': 'raw', 'query': query, 'wiki': wiki, 'id': msg.channel.id + '@' + msg.guild.id });
		}
	}

	if (objArr.length > 0) {
		buildMessage(objArr).then(replString => {
			msg.channel.send(replString);
		});
	}
};

const parseWikiFromQuery = query => {
	if (/^.*?:/g.test(query)) {
		let potWiki = query.match(/^.*?:/g)[0].replace(':', '');
		if (wikis.hasOwnProperty(potWiki)) {
			return potWiki;
		} else {
			if (aliases.hasOwnProperty(potWiki)) {
				return aliases[potWiki];
			} else {
				return 'default';
			}
		}
	} else {
		return 'default';
	}
};

const buildMessage = objectArray => {
	return new Promise((resolve, reject) => {
		let promiseArray = [];
		for (let i = 0; i < objectArray.length; i++) {
			promiseArray.push(requestLink(objectArray[i].query, objectArray[i].wiki, objectArray[i].type, objectArray[i].id));
		}
		Promise.all(promiseArray).then(objects => {
			let replyString = '**Links detected:**';
			for (let j = 0; j < objects.length; j++) {
				if (objects[j] === 404) continue;
				console.log(objects[j]);
				replyString += '\n<' + objects[j][3][0] + '>';
			}
			return resolve(replyString);
		});
	});
};

const requestLink = (query, wiki, type, changuildID) => {
	return new Promise((resolve, reject) => {
		let wurl = '';
		if (wiki === 'default') {
			//go into database and find out the right wiki for this channel using changuildID
			//Format is channelID@guildID
		} else {
			wurl = wikis[wiki];
		}

		if (type === 'template') {
			query = 'Template:' + query;
		}

		if (type !== 'raw') {
			let url = `${wurl}/api.php?action=opensearch&search=${query}&limit=1&redirects=resolve`;
			needle('get', url).then(response => {
				if (response.statusCode === 404) {
					return resolve(404);
				}
				return resolve(response.body);
			}).catch(err => {
				return reject(err);
			});
		} else {
			let url = `${wurl}/w/${query.replace(/ /g, '_')}`;
			return resolve([ query, [ query ], [ '' ], [ url ] ]);
		}
	});
};

bot.login(config.token);
