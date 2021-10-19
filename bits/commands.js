const fs = require('fs');

const wikis = require('./wikis.json');
const walias = require('./aliases.json');
const config = require('./config.json');

const aliases = {
	//TBI
};

const commands = {
	//Levels of permission:
	//0 - Everyone
	//1 - Server admins (permission of ADMINISTRATOR) and bot creator
	//2 - Bot creator
	'wiki': {
		level: 1,
		help_desc: 'set the wiki of the entire server',
		help_subcmds: '',
		process: (bot, msg, args, isDM, db) => {
			let wiki = args[0];
			if (isDM) {
				const dRow = db.prepare('SELECT * FROM dms WHERE id=?').get(msg.channel.id);
				if (dRow) {
					if (Object.keys(wikis).includes(wiki)) {
						db.prepare('UPDATE dms SET wiki=? WHERE id=?').run(wiki, msg.channel.id);
						msg.channel.send(`The wiki of this direct message channel is now set to **${wikis[wiki].longname}**.`);
					} else if (Object.keys(walias).includes(wiki)) {
						db.prepare('UPDATE dms SET wiki=? WHERE id=?').run(walias[wiki].wiki, msg.channel.id);
						msg.channel.send(`The wiki of this direct message channel is now set to **${wikis[walias[wiki].wiki].longname}**.`);
					} else {
						invalidReply(bot, msg, true);
					}
				} else {
					if (Object.keys(wikis).includes(wiki)) {
						db.prepare('INSERT INTO dms (id, wiki) VALUES (?,?)').run(msg.channel.id, wiki);
						msg.channel.send(`The wiki of this direct message channel is now set to **${wikis[wiki].longname}**.`);
					} else if (Object.keys(walias).includes(wiki)) {
						db.prepare('INSERT INTO dms (id, wiki) VALUES (?,?)').run(msg.channel.id, walias[wiki].wiki);
						msg.channel.send(`The wiki of this direct message channel is now set to **${wikis[walias[wiki].wiki].longname}**.`);
					} else {
						invalidReply(bot, msg, true);
					}
				}
			} else {
				if (Object.keys(wikis).includes(wiki)) {
					db.prepare('UPDATE guilds SET mainWiki=? WHERE id=?').run(wiki, msg.guild.id);
					msg.channel.send(`The wiki of this server is now set to **${wikis[wiki].longname}**.`);
				} else if (Object.keys(walias).includes(wiki)) {
					db.prepare('UPDATE guilds SET mainWiki=? WHERE id=?').run(walias[wiki].wiki, msg.guild.id);
					msg.channel.send(`The wiki of this server is now set to **${wikis[walias[wiki].wiki].longname}**.`);
				} else {
					invalidReply(bot, msg, true);
				}
			}
		}
	},
	'override': {
		level: 1,
		help_desc: 'set the wiki override for the current channel',
		help_subcmds: '',
		process: (bot, msg, args, isDM, db) => {
			if (isDM) {
				msg.channel.send('You can\'t set overrides in a DM!');
				return;
			}
			let wiki = args[0];
			if (Object.keys(wikis).includes(wiki)) {
				const oRow = db.prepare('SELECT * FROM overrides WHERE guildID=? AND channelID=?').get(msg.guild.id, msg.channel.id);
				if (!oRow) {
					db.prepare('INSERT INTO overrides VALUES (?,?,?)').run(msg.guild.id, msg.channel.id, wiki);
				} else {
					const gRow = db.prepare('SELECT * FROM guilds WHERE id=?').get(msg.guild.id);
					if (gRow.mainWiki === wiki) {
						db.prepare('DELETE FROM overrides WHERE guildID=? AND channelID=?').run(msg.guild.id, msg.channel.id);
					} else {
						db.prepare('UPDATE overrides SET wiki=? WHERE guildID=? AND channelID=?').run(wiki, msg.guild.id, msg.channel.id);
					}
				}
				msg.reply(`The wiki of channel **${msg.channel.name}** is now set to **${wikis[wiki].longname}**.`);
			} else if (Object.keys(walias).includes(wiki)) {
				const oRow = db.prepare('SELECT * FROM overrides WHERE guildID=? AND channelID=?').get(msg.guild.id, msg.channel.id);
				if (!oRow) {
					db.prepare('INSERT INTO overrides VALUES (?,?,?)').run(msg.guild.id, msg.channel.id, walias[wiki].wiki);
				} else {
					const gRow = db.prepare('SELECT * FROM guilds WHERE id=?').get(msg.guild.id);
					if (gRow.mainWiki === wiki) {
						db.prepare('DELETE FROM overrides WHERE guildID=? AND channelID=?').run(msg.guild.id, msg.channel.id);
					} else {
						db.prepare('UPDATE overrides SET wiki=? WHERE guildID=? AND channelID=?').run(walias[wiki].wiki, msg.guild.id, msg.channel.id);
					}
				}
				msg.reply(`The wiki of channel **${msg.channel.name}** is now set to **${wikis[walias[wiki].wiki].longname}**.`);
			} else {
				invalidReply(bot, msg, true);
			}
		}
	},
	'config': {
		level: 0,
		help_desc: 'shows the bot setup for the current server',
		help_subcmds: '',
		process: (bot, msg, args, isDM, db) => {
			if (isDM) {
				const dRow = db.prepare('SELECT * FROM dms WHERE id=?').get(msg.channel.id);
				if (!dRow) {
					let configString = `\`\`\`md\n# Information for this direct message channel`;
					configString += `\n<channel_id ${msg.channel.id}>`;
					configString += `\n<wiki not set>`;
					configString += '\n```';
					msg.channel.send(configString);
				} else {
					let configString = `\`\`\`md\n# Information for this direct message channel`;
					configString += `\n<channel_id ${msg.channel.id}>`;
					if (!dRow.wiki) {
						configString += '\n<wiki not set>';
					} else {
						configString += `\n<wiki ${wikis[dRow.wiki].longname}>`;
					}
					configString += '\n```';
					msg.channel.send(configString);
				}
			} else {
				const gRow = db.prepare('SELECT * FROM guilds WHERE id=?').get(msg.guild.id);
				let configString = `\`\`\`md\n# Information for server ${msg.guild.name}`;
				configString += `\n<server_id ${msg.guild.id}>`;
				if (!gRow.mainWiki) {
					configString += '\n<main_wiki not set>';
				} else {
					configString += `\n<main_wiki ${wikis[gRow.mainWiki].longname}>`;
				}
				const rows = db.prepare('SELECT * FROM overrides WHERE guildID=?').all(msg.guild.id);
				configString += `\n<overrides ${rows.length} total>`;
				if (rows.length > 0) {
					let longest = 0;
					for (let i = 0; i < rows.length; i++) {
						if (bot.channels.cache.get(rows[i].channelID)) {
							if (bot.channels.cache.get(rows[i].channelID).name.length > longest) longest = bot.channels.cache.get(rows[i].channelID).name.length;
						} else {
							if (7 > longest) longest = 7;
						}
					}
					for (let i = 0; i < rows.length; i++) {
						if (bot.channels.cache.get(rows[i].channelID)) {
							configString += `\n[${bot.channels.cache.get(rows[i].channelID).name.padStart(longest)}][${wikis[rows[i].wiki].longname}]`;
						} else {
							configString += `\n[${`?#${rows[i].channelID.substring(rows[i].channelID.length - 4)}?`.padStart(longest)}][${wikis[rows[i].wiki].longname}]`;
						}
					}
				}
				configString += '\n```';
				msg.channel.send(configString);
			}
		}
	},
	'restart': {
		level: 2,
		process: (bot, msg) => {
			msg.reply('Restarting bot!');
			setTimeout(() => process.exit(1), 500);
		}
	},
	'servers': {
		level: 2,
		process: (bot, msg) => {
			const servers = Array.from(bot.guilds.cache.values()).sort((a,b) => a.memberCount - b.memberCount).map(guild => `${guild.name} (with ${guild.memberCount} members)`).join('\n');
			fs.writeFileSync('./servers.txt', servers);
			msg.channel.send({content: 'Here they are', files: [{attachment: './servers.txt', name: 'servers.txt'}]});
		}
	},
	'help': {
		level: 0,
		help_desc: 'shows this message',
		help_subcmds: '',
		process: (bot, msg) => {
			let header = '```md\n# COMMAND LIST\n';
			let footer = '\n# Linking syntax\n* < [[term]] > uses the API to search for the page\n* < {{term}} > uses the API to search for the template\n* < --term-- > links to the page no matter' +
					 ' what, which means the page may not exist.\n\n# One-time overrides\n* You can use the name of the wiki before a link to apply it to a different wiki than the' +
					 ' default one for the channel.\n* For example, in a channel where the default is the RS3 wiki, <[[osrs:Bucket]]> links to the OSRS version of the page.\n\n' +
					 '# Privacy policy\nThe privacy policy for GloopyBot can be found at https://invalid.cards/gloopybot/\n```';
			let cmdlist = '';
			let longest = -1;
			for (let i = 0; i < Object.getOwnPropertyNames(commands).length; i++) {
				let item = Object.getOwnPropertyNames(commands)[i];
				if (!commands.hasOwnProperty(item) || !commands[item].hasOwnProperty('help_desc') || commands[item].help_desc == false) {
					continue;
				}
				
				let compareString = config.prefix + item;
				if (longest < compareString.length) longest = compareString.length;
			}

			for (let i = 0; i < Object.getOwnPropertyNames(commands).length; i++) {
				let item = Object.getOwnPropertyNames(commands)[i];
				if (!commands.hasOwnProperty(item) || !commands[item].hasOwnProperty('help_desc') || commands[item].help_desc == false) {
					continue;
				}

				cmdlist += `<${(config.prefix + item).padEnd(longest)} ${commands[item].help_desc}>\n`;
				if (commands[item].help_subcmds) {
					cmdlist += `  * Subcommands: ${commands[item].help_subcmds}\n`;
				}
			}

			msg.channel.send(header + cmdlist + footer);
		}
	},
	'list': {
		level: 0,
		help_desc: 'shows all available wikis',
		help_subcmds: '',
		process: (bot, msg) => {
			invalidReply(bot, msg, false);
		}
	},
	'invite': {
		level: 0,
		help_desc: 'get the invite for adding the bot to your own server',
		help_subcmds: '',
		process: (bot, msg) => {
			msg.reply('Add the bot to your own server using the invite link below:\n<https://nvld.krd/gloopybot>');
		}
	},
	'userwiki': {
		level: 0,
		help_desc: 'set your own personal user override, which has higher priority than any other setting. use "default" to reset',
		help_subcmds: '',
		process: (bot, msg, args, isDM, db) => {
			let wiki = args[0];
			if (Object.keys(wikis).includes(wiki)) {
				const uRow = db.prepare('SELECT * FROM userOverride WHERE userID=?').get(msg.author.id);
				if (!uRow) {
					db.prepare('INSERT INTO userOverride VALUES (?,?)').run(msg.author.id, wiki);
				} else {
					db.prepare('UPDATE userOverride SET wiki=? WHERE userID=?').run(wiki, msg.author.id);
				}
				msg.reply(`Your personal override wiki is now set to **${wikis[wiki].longname}**.`);
			} else if (Object.keys(walias).includes(wiki)) {
				const uRow = db.prepare('SELECT * FROM userOverride WHERE userID=?').get(msg.author.id);
				if (!uRow) {
					db.prepare('INSERT INTO userOverride VALUES (?,?)').run(msg.author.id, walias[wiki].wiki);
				} else {
					db.prepare('UPDATE userOverride SET wiki=? WHERE userID=?').run(walias[wiki].wiki, msg.author.id);
				}
				msg.reply(`Your personal override wiki is now set to **${wikis[walias[wiki].wiki].longname}**.`);
			} else if (wiki === 'default') {
				db.prepare('DELETE FROM userOverride WHERE userID=?').run(msg.author.id);
				msg.reply('You will now always use the default wiki of the channel you are talking in.');
			} else {
				invalidReply(bot, msg, true);
			}
		}
	}
};

const invalidReply = (bot, msg, isNotList) => {
	let replyString = 'Here is a list of wikis you can set:';
	if (isNotList) replyString = 'That\'s not a wiki I know of. Here\'s a list of wikis you can set:';
	for (let wiki in wikis) {
		if (!wikis.hasOwnProperty(wiki)) continue;

		replyString += '\n' + wikis[wiki].longname + ': ' + wiki;
		for (let alias in walias) {
			if (!walias.hasOwnProperty(alias)) continue;

			if (walias[alias].wiki == wiki) {
				replyString += ', ' + alias;
				if (walias[alias].setOnly) {
					replyString += '※';
				}
			}
		}
	}
	replyString += '\n*Aliases denoted with ※ can only be used to set the wiki, not for one-time overrides.*';
	replyString += '\n*The full name (in front of the colon) can not be used for either purpose and only serves as label.*';
	msg.reply(replyString);
};

module.exports.commands = commands;
module.exports.aliases = aliases;
