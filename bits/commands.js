const sql = require('sqlite');
sql.open('./bits/db.sqlite');

const wikis = require('./wikis.json');
const walias = require('./aliases.json');

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
		process: (bot, msg, args) => {
			let wiki = args[0];
			if (Object.keys(wikis).includes(wiki)) {
				sql.run('UPDATE guilds SET mainWiki=? WHERE id=?', wiki, msg.guild.id).then(() => {
					msg.reply(`the wiki of guild **${msg.guild.name}** is now set to **${wikis[wiki].longname}**.`);
				});
			} else if (Object.keys(walias).includes(wiki)) {
				sql.run('UPDATE guilds SET mainWiki=? WHERE id=?', walias[wiki].wiki, msg.guild.id).then(() => {
					msg.reply(`the wiki of guild **${msg.guild.name}** is now set to **${wikis[walias[wiki].wiki].longname}**.`);
				});
			} else {
				msg.reply('bad!');
			}
		}
	},
	'override': {
		level: 1,
		process: (bot, msg, args) => {
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
				msg.reply('bad!');
			}
		}
	},
	'config': {
		level: 0,
		process: (bot, msg) => {
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
};

module.exports.commands = commands;
module.exports.aliases = aliases;
