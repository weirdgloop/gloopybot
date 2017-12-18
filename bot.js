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
	bot.guilds.forEach(guild => {
		sql.get('SELECT * FROM guild WHERE id=?', guild.id).then(row => {
			if (!row) {
				sql.run('INSERT INTO guilds(id) VALUES (?)', guild.id);
			}
		}).catch(() => {
			sql.run('CREATE TABLE IF NOT EXISTS guilds (id TEXT, mainWiki TEXT)').then(() => {
				return sql.run('CREATE TABLE IF NOT EXISTS overrides (guildID TEXT, channelID TEXT, wiki TEXT)');
			}).then(() => {
				return sql.run('INSERT INTO guilds(id) VALUES (?)', guild.id);
			});
		});
	});
	reallyReady();
});

const reallyReady = () => {
	bot.user.setGame(`with gloop | ${config.prefix}help`);
	console.log(`Ready: serving ${bot.guilds.size} guilds, in ${bot.channels.size} channels, for ${bot.users.size} users.`);
};

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
			if (wiki !== 'default') query = query.replace(/^.*?:/g, '');
			objArr.push({ 'type': 'search', 'query': query, 'wiki': wiki, 'id': msg.channel.id + '@' + msg.guild.id });
		}
	}

	if (/{{([^|]*?)}}/g.test(msg.cleanContent)) {
		let queries = msg.cleanContent.match(/{{([^|]*?)}}/g);
		for (let i = 0; i < queries.length; i++) {
			let query = queries[i].replace(/[{}]{2}/g, '');
			let wiki = parseWikiFromQuery(query);
			if (wiki !== 'default') query = query.replace(/^.*?:/g, '');
			objArr.push({ 'type': 'template', 'query': query, 'wiki': wiki, 'id': msg.channel.id + '@' + msg.guild.id });
		}
	}

	if (/--([^|]*?)--/g.test(msg.cleanContent)) {
		let queries = msg.cleanContent.match(/--([^|]*?)--/g);
		for (let i = 0; i < queries.length; i++) {
			let query = queries[i].replace(/-{2}/g, '');
			let wiki = parseWikiFromQuery(query);
			if (wiki !== 'default') query = query.replace(/^.*?:/g, '');
			objArr.push({ 'type': 'raw', 'query': query, 'wiki': wiki, 'id': msg.channel.id + '@' + msg.guild.id });
		}
	}

	if (objArr.length > 0) {
		buildMessage(objArr).then(replString => {
			msg.channel.send(replString);
		}).catch(err => {
			if (err === 'NVL') {
				//No valid links found (all 404s) - noop
			} else {
				console.error(err);
			}
		});
	}
};

const parseWikiFromQuery = query => {
	if (/^.*?:/g.test(query)) {
		let potWiki = query.match(/^.*?:/g)[0].replace(':', '');
		if (wikis.hasOwnProperty(potWiki)) {
			return potWiki;
		} else {
			if (aliases.hasOwnProperty(potWiki) && !aliases[potWiki].setOnly) {
				return aliases[potWiki.wiki];
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
			let replyStringBegin = '**Links detected:**';
			let replyString = '';
			for (let j = 0; j < objects.length; j++) {
				if (objects[j] === 404) continue;
				replyString += '\n<' + objects[j][3][0] + '>';
			}
			if (replyString.length > 0) return resolve(replyStringBegin + replyString);
			else return reject('NVL');
		});
	});
};

const getWiki = (objWiki, changuildID) => {
	return new Promise((resolve, reject) => {
		if (objWiki === 'default') {
			sql.get('SELECT * FROM guilds WHERE id=?', changuildID.split('@')[1]).then(row => {
				if (!row.mainWiki) {
					return reject('NDW');
				}
				sql.get('SELECT * FROM overrides WHERE guildID=? AND channelID=?', row.id, changuildID.split('@')[0]).then(crow => {
					if (!crow) {
						return resolve(wikis[row.mainWiki].url);
					} else {
						return resolve(wikis[crow.wiki].url);
					}
				});
			});
		} else {
			return resolve(wikis[objWiki].url);
		}
	});
};

const requestLink = (query, wiki, type, changuildID) => {
	return new Promise((resolve, reject) => {
		getWiki(wiki, changuildID).then(wurl => {
			if (type === 'template') {
				query = 'Template:' + query;
			}
	
			if (type !== 'raw') {
				let url = `${wurl}/api.php?action=opensearch&search=${query}&limit=1&redirects=resolve`;
				needle('get', url).then(response => {
					if (response.body[1].length === 0) {
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
	});
};

bot.login(config.token);
