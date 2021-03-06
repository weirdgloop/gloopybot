const needle = require('needle');
const Discord = require('discord.js');
const bot = new Discord.Client({intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.DIRECT_MESSAGES]});

const config = require('./bits/config.json');
const wikis = require('./bits/wikis.json');
const aliases = require('./bits/aliases.json');
const commands = require('./bits/commands.js');

const db = require('better-sqlite3')('./bits/db.sqlite');

const pj = require('./package.json');

needle.defaults({
	user_agent: `GloopyBot/${pj.version}`
});

bot.once('ready', () => {
	db.prepare('CREATE TABLE IF NOT EXISTS guilds (id TEXT, mainWiki TEXT)').run();
	db.prepare('CREATE TABLE IF NOT EXISTS overrides (guildID TEXT, channelID TEXT, wiki TEXT)').run();
	db.prepare('CREATE TABLE IF NOT EXISTS userOverride (userid TEXT, wiki TEXT)').run();
	bot.guilds.cache.forEach(guild => {
		const gRow = db.prepare('SELECT * FROM guilds WHERE id=?').get(guild.id);
		if (!gRow) {
			db.prepare('INSERT INTO guilds(id) VALUES (?)').run(guild.id);
		}
	});
	bot.user.setActivity(`with gloop | ${config.prefix}help`);
	console.log(`Ready: serving ${bot.guilds.cache.size} guilds.`);
});

bot.on('error', error => {
	console.error('Websocket error! ' + error);
});

bot.on('guildCreate', guild => {
	try {
		const gRow = db.prepare('SELECT * FROM guilds WHERE id=?').get(guild.id);
		if (!gRow) {
			db.prepare('INSERT INTO guilds(id) VALUES (?)').run(guild.id);
		}
	} catch(e) {
		db.prepare('CREATE TABLE IF NOT EXISTS guilds (id TEXT, mainWiki TEXT)').run();
		db.prepare('INSERT INTO guilds(id) VALUES (?)').run(guild.id);
	}
});

bot.on('messageCreate', msg => {
	if (msg.author.bot) return;
	if (msg.channel.type == 'GROUP_DM' || msg.channel.type == 'GUILD_CATEGORY') return;

	if (msg.channel.type == 'DM') {
		try {
			const dRow = db.prepare('SELECT * FROM dms WHERE id=?').get(msg.channel.id);
			if (!dRow) {
				db.prepare('INSERT INTO dms(id) VALUES (?)').run(msg.channel.id);
			}
		} catch(e) {
			db.prepare('CREATE TABLE IF NOT EXISTS dms (id TEXT, wiki TEXT)').run();
			db.prepare('INSERT INTO dms(id) VALUES (?)').run(guild.id);
		}
		init(msg, true);
	} else {
		init(msg, false);
	}
});

const init = (msg, isDM) => {
	if (msg.cleanContent.startsWith(config.prefix)) {
		let cmd = msg.cleanContent.split(' ')[0].substring(config.prefix.length);
		let args = msg.cleanContent.split(' ').slice(1);
		if (commands.commands.hasOwnProperty(cmd)) {
			if (commands.commands[cmd].level !== 0) {
				if (commands.commands[cmd].level === 1) {
					if (!authorIsAnyAdmin(msg, isDM)) {
						msg.reply('You have to be a server administrator to do this.');
					} else {
						commands.commands[cmd].process(bot, msg, args, isDM, db);
					}
				} else {
					if (!authorIsBotCreator(msg, isDM)) {
						msg.reply('Only the creator of the bot can do this.');
					} else {
						commands.commands[cmd].process(bot, msg, args, isDM, db);
					}
				}
			} else {
				commands.commands[cmd].process(bot, msg, args, isDM, db);
			}
		} else {
			parseLinks(msg, isDM);
		}
	} else {
		parseLinks(msg, isDM);
	}
}

const authorIsServerAdmin = (msg, isDM) => {
	if (isDM) return true;
	if (msg.guild.id == config.testServer) return true;
	return msg.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR);
};

const authorIsBotCreator = (msg, isDM) => {
	if (isDM) return config.adminID == msg.channel.recipient.id;
	return config.adminID == msg.author.id;
};

const authorIsAnyAdmin = (msg, isDM) => {
	return authorIsServerAdmin(msg, isDM) || authorIsBotCreator(msg, isDM);
};

const parseLinks = (msg, isDM) => {
	let objArr = [];
	const removeCodeBlocks = msg.cleanContent.replace(/`{3}[\S\s]*?`{3}/gm, '');
	const removeInlineCode = removeCodeBlocks.replace(/`[\S\s]*?`/gm, '');
	const removeLinks = removeInlineCode.replace(/(https?:\/\/[\w./#?&_-]*)/gm, '');

	if (/\[\[(.*?)(?:\|.*?)?\]\]/g.test(removeLinks)) {
		let queries = removeLinks.match(/\[\[(.*?)(?:\|.*?)?\]\]/g);
		for (let i = 0; i < queries.length; i++) {
			let query = queries[i].replace(/\[\[(.*?)(?:\|.*?)?\]\]/g, '$1');
			let wiki = parseWikiFromQuery(query);
			if (wiki !== 'default') query = query.replace(/^.*?:/g, '');
			objArr.push({ 'type': 'search', 'query': query, 'wiki': wiki, 'id': isDM ? msg.channel.id : msg.channel.id + '@' + msg.guild.id, 'user': msg.author.id });
		}
	}

	if (/{{(.*?)(?:\|.*?)?}}/g.test(removeLinks)) {
		let queries = removeLinks.match(/{{(.*?)(?:\|.*?)?}}/g);
		for (let i = 0; i < queries.length; i++) {
			let query = queries[i].replace(/{{(.*?)(?:\|.*?)?}}/g, '$1');
			let wiki = parseWikiFromQuery(query);
			if (wiki !== 'default') query = query.replace(/^.*?:/g, '');
			objArr.push({ 'type': 'template', 'query': query, 'wiki': wiki, 'id': isDM ? msg.channel.id : msg.channel.id + '@' + msg.guild.id, 'user': msg.author.id });
		}
	}

	if (/--(.*?)(?:\|.*?)?--/g.test(removeLinks)) {
		let queries = removeLinks.match(/--(.*?)(?:\|.*?)?--/g);
		for (let i = 0; i < queries.length; i++) {
			let query = queries[i].replace(/--(.*?)(?:\|.*?)?--/g, '$1');
			let wiki = parseWikiFromQuery(query);
			if (wiki !== 'default') query = query.replace(/^.*?:/g, '');
			objArr.push({ 'type': 'raw', 'query': query, 'wiki': wiki, 'id': isDM ? msg.channel.id : msg.channel.id + '@' + msg.guild.id, 'user': msg.author.id });
		}
	}

	if (objArr.length > 0) {
		buildMessage(objArr, isDM).then(replString => {
			msg.channel.send(replString);
		}).catch(err => {
			if (err === 'NVL') {
				msg.channel.send('**No search results found for the attempted link(s).**\nTry using dashes instead to force-create a URL.');
			} else if (err === 'NDW') {
				msg.reply(`This server has no default wiki set. Please set one ${!isDM ? 'or have a server administrator set one ' : ''}using \`${config.prefix}wiki\`.`);
			} else if (err === 'ERO') {
				()=>{}; //noop - if it's only empty rawlinks just ignore the entire message altogether
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
				return aliases[potWiki].wiki;
			} else {
				return 'default';
			}
		}
	} else {
		return 'default';
	}
};

const buildMessage = (objectArray, isDM) => {
	return new Promise((resolve, reject) => {
		let promiseArray = [];
		for (let i = 0; i < objectArray.length; i++) {
			promiseArray.push(requestLink(objectArray[i].query, objectArray[i].wiki, objectArray[i].type, objectArray[i].id, isDM, objectArray[i].user));
		}
		Promise.all(promiseArray).then(objects => {
			let emptyRawsOnly = true;
			let replyStringBegin = '**Links detected:**';
			let replyString = '';
			for (let j = 0; j < objects.length; j++) {
				if (objects[j] === 404) continue;
				if (objects[j][0][0] !== '' && objects[j][1][0] !== '') emptyRawsOnly = false;
				else continue;
				replyString += '\n<' + fixDiscordLink(objects[j][3][0]) + '>';
			}
			if (emptyRawsOnly) return reject('ERO');
			if (replyString.length > 0) return resolve(replyStringBegin + replyString);
			else return reject('NVL');
		}).catch(err => {
			if (err === 'NDW') {
				return reject('NDW');
			}
		});
	});
};

const getWiki = (objWiki, changuildID, isDM, user) => {
	return new Promise((resolve, reject) => {
		if (objWiki === 'default') {
			if (isDM) {
				const dRow = db.prepare('SELECT * FROM dms WHERE id=?').get(changuildID);
				if (!dRow || !dRow.wiki) {
					return reject('NDW');
				}
				return resolve(wikis[dRow.wiki].url);
			} else {
				const uRow = db.prepare('SELECT * FROM userOverride WHERE userID=?').get(user);
				if (uRow && uRow.wiki) {
					return resolve(wikis[uRow.wiki].url);
				} else {
					const gRow = db.prepare('SELECT * FROM guilds WHERE id=?').get(changuildID.split('@')[1]);
					if (!gRow || !gRow.mainWiki) {
						return reject('NDW');
					}
					const oRow = db.prepare('SELECT * FROM overrides WHERE guildID=? AND channelID=?').get(gRow.id, changuildID.split('@')[0]);
					if (!oRow) {
						return resolve(wikis[gRow.mainWiki].url);
					} else {
						return resolve(wikis[oRow.wiki].url);
					}
				}
			}
		} else {
			return resolve(wikis[objWiki].url);
		}
	});
};

const requestLink = (query, wiki, type, changuildID, isDM, user) => {
	return new Promise((resolve, reject) => {
		getWiki(wiki, changuildID, isDM, user).then(wurl => {
			if (type === 'template') {
				query = 'Template:' + query;
			}
	
			if (type !== 'raw') {
				if (wurl.includes('wikipedia')) wurl += '/w';
				let url = `${wurl}/api.php?action=opensearch&search=${wikiUrlEncode(query)}&redirects=resolve`;
				needle('get', url).then(response => {
					if (response.body[1].length === 0) {
						return resolve(404);
					}
					return resolve(response.body);
				}).catch(err => {
					return reject(err);
				});
			} else {
				let url = `${wurl}/w/${query}`;
				if (wurl.includes('wikipedia')) url = `${wurl}/wiki/${query}`;
				return resolve([ query, [ query ], [ '' ], [ url ] ]);
			}
		}).catch(err => {
			if (err === 'NDW') {
				return reject('NDW');
			}
		});
	});
};

const fixDiscordLink = (url) => url.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/%23/g, '#').replace(/ /g, '_');

const wikiUrlEncode = (url) => encodeURIComponent(url)
	.replace(/!/g, '%21')
	.replace(/'/g, '%27')
	.replace(/\(/g, '%28')
	.replace(/\)/g, '%29')
	.replace(/\*/g, '%2A')
	.replace(/~/g, '%7E')
	.replace(/%20/g, '_')
	.replace(/%3A/g, ':')
	.replace(/%2F/g, '/')
	.replace(/\+/g, '%2B')
	.replace(/\@/g, '%40');

//String.prototype.padStart polyfill
if (!String.prototype.padStart) {
	String.prototype.padStart = function padStart(targetLength, padString) {
		targetLength = targetLength >> 0; //floor if number or convert non-number to 0;
		padString = String(padString || ' ');
		if (this.length > targetLength) {
			return String(this);
		} else {
			targetLength = targetLength - this.length;
			if (targetLength > padString.length) {
				padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
			}
			return padString.slice(0, targetLength) + String(this);
		}
	};
}

bot.login(config.token);
