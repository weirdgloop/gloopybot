const sql = require('sqlite');
sql.open('./bits/db.sqlite');

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
		process: (bot, msg, args, isDM) => {
			let wiki = args[0];
			if (isDM) {
				sql.get('SELECT * FROM dms WHERE id=?', msg.channel.id).then(row => {
					if (row) {
						if (Object.keys(wikis).includes(wiki)) {
							sql.run('UPDATE dms SET wiki=? WHERE id=?', wiki, msg.channel.id).then(() => {
								msg.channel.send(`The wiki of this direct message channel is now set to **${wikis[wiki].longname}**.`);
							}).catch(err => { console.error('DM update wiki\n' + err) });
						} else if (Object.keys(walias).includes(wiki)) {
							sql.run('UPDATE dms SET wiki=? WHERE id=?', walias[wiki].wiki, msg.channel.id).then(() => {
								msg.channel.send(`The wiki of this direct message channel is now set to **${wikis[walias[wiki].wiki].longname}**.`);
							}).catch(err => { console.error('DM update alias\n' + err) });
						} else {
							invalidReply(bot, msg, true);
						}
					} else {
						if (Object.keys(wikis).includes(wiki)) {
							sql.run('INSERT INTO dms (id, wiki) VALUES (?,?)', [msg.channel.id, wiki]).then(() => {
								msg.channel.send(`The wiki of this direct message channel is now set to **${wikis[wiki].longname}**.`);
							}).catch(err => { console.error('DM insert wiki\n' + err) });
						} else if (Object.keys(walias).includes(wiki)) {
							sql.run('INSERT INTO dms (id, wiki) VALUES (?,?)', [msg.channel.id, walias[wiki].wiki]).then(() => {
								msg.channel.send(`The wiki of this direct message channel is now set to **${wikis[walias[wiki].wiki].longname}**.`);
							}).catch(err => { console.error('DM insert alias\n' + err) });
						} else {
							invalidReply(bot, msg, true);
						}
					}
				}).catch(err => { console.error('DM get\n' + err) });
			} else {
				if (Object.keys(wikis).includes(wiki)) {
					sql.run('UPDATE guilds SET mainWiki=? WHERE id=?', wiki, msg.guild.id).then(() => {
						msg.reply(`the wiki of guild **${msg.guild.name}** is now set to **${wikis[wiki].longname}**.`);
					});
				} else if (Object.keys(walias).includes(wiki)) {
					sql.run('UPDATE guilds SET mainWiki=? WHERE id=?', walias[wiki].wiki, msg.guild.id).then(() => {
						msg.reply(`the wiki of guild **${msg.guild.name}** is now set to **${wikis[walias[wiki].wiki].longname}**.`);
					});
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
		process: (bot, msg, args, isDM) => {
			if (isDM) {
				msg.channel.send('You can\'t set overrides in a DM!');
				return;
			}
			let wiki = args[0];
			if (Object.keys(wikis).includes(wiki)) {
				sql.get('SELECT * FROM overrides WHERE guildID=? AND channelID=?', msg.guild.id, msg.channel.id).then(orow => {
					if (!orow) {
						return sql.run('INSERT INTO overrides VALUES (?,?,?)', msg.guild.id, msg.channel.id, wiki);
					} else {
						return sql.get('SELECT * FROM guilds WHERE id=?', msg.guild.id).then(grow => {
							if (grow.mainWiki === wiki) {
								return sql.run('DELETE FROM overrides WHERE guildID=? AND channelID=?', msg.guild.id, msg.channel.id);
							} else {
								return sql.run('UPDATE overrides SET wiki=? WHERE guildID=? AND channelID=?', wiki, msg.guild.id, msg.channel.id);
							}
						});
					}
				}).then(() => {
					msg.reply(`the wiki of channel **${msg.channel.name}** is now set to **${wikis[wiki].longname}**.`);
				});
			} else if (Object.keys(walias).includes(wiki)) {
				sql.get('SELECT * FROM overrides WHERE guildID=? AND channelID=?', msg.guild.id, msg.channel.id).then(orow => {
					if (!orow) {
						return sql.run('INSERT INTO overrides VALUES (?,?,?)', msg.guild.id, msg.channel.id, walias[wiki].wiki);
					} else {
						return sql.get('SELECT * FROM guilds WHERE id=?', msg.guild.id).then(grow => {
							if (grow.mainWiki === walias[wiki].wiki) {
								return sql.run('DELETE FROM overrides WHERE guildID=? AND channelID=?', msg.guild.id, msg.channel.id);
							} else {
								return sql.run('UPDATE overrides SET wiki=? WHERE guildID=? AND channelID=?', walias[wiki].wiki, msg.guild.id, msg.channel.id);
							}
						});
					}
				}).then(() => {
					msg.reply(`the wiki of channel **${msg.channel.name}** is now set to **${wikis[walias[wiki].wiki].longname}**.`);
				});
			} else {
				invalidReply(bot, msg, true);
			}
		}
	},
	'config': {
		level: 0,
		help_desc: 'shows the bot setup for the current server',
		help_subcmds: '',
		process: (bot, msg, args, isDM) => {
			if (isDM) {
				sql.get('SELECT * FROM dms WHERE id=?', msg.channel.id).then(row => {
					let configString = `\`\`\`md\n# Information for this direct message channel`;
					configString += `\n<channel_id ${msg.channel.id}>`;
					if (!row.wiki) {
						configString += '\n<wiki not set>';
					} else {
						configString += `\n<wiki ${wikis[row.wiki].longname}>`;
					}
					configString += '\n```';
					msg.channel.send(configString);
				});
			} else {
				sql.get('SELECT * FROM guilds WHERE id=?', msg.guild.id).then(grow => {
					let configString = `\`\`\`md\n# Information for server ${msg.guild.name}`;
					configString += `\n<server_id ${msg.guild.id}>`;
					if (!grow.mainWiki) {
						configString += '\n<main_wiki not set>';
					} else {
						configString += `\n<main_wiki ${wikis[grow.mainWiki].longname}>`;
					}
					sql.all('SELECT * FROM overrides WHERE guildID=?', msg.guild.id).then(rows => {
						configString += `\n<overrides ${rows.length} total>`;
						if (rows.length > 0) {
							let longest = 0;
							for (let i = 0; i < rows.length; i++) {
								if (bot.channels.get(rows[i].channelID)) {
									if (bot.channels.get(rows[i].channelID).name.length > longest) longest = bot.channels.get(rows[i].channelID).name.length;
								} else {
									if (7 > longest) longest = 7;
								}
							}
							for (let i = 0; i < rows.length; i++) {
								if (bot.channels.get(rows[i].channelID)) {
									configString += `\n[${bot.channels.get(rows[i].channelID).name.padStart(longest)}][${wikis[rows[i].wiki].longname}]`;
								} else {
									configString += `\n[${`?#${rows[i].channelID.substring(rows[i].channelID.length - 4)}?`.padStart(longest)}][${wikis[rows[i].wiki].longname}]`;
								}
							}
						}
						configString += '\n```';
						msg.channel.send(configString);
					});
				});
			}
		}
	},
	'restart': {
		level: 2,
		process: (bot, msg) => {
			msg.reply('restarting bot!');
			setTimeout(() => process.exit(1), 500);
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
					 ' default one for the channel.\n* For example, in a channel where the default is the RS3 wiki, <[[osrs:Bucket]]> links to the OSRS version of the page.\n```';
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
			msg.reply(['add the bot to your own server using the invite link below:','https://discordapp.com/oauth2/authorize?client_id=393024915755761674&scope=bot&permissions=330752']);
		}
	}
};

const invalidReply = (bot, msg, isNotList) => {
	let replyString = 'here is a list of wikis you can set:';
	if (isNotList) replyString = 'that\'s not a wiki I know of. Here\'s a list of wikis you can set:';
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
