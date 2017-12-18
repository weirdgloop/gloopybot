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
	//1 - Server admins (permission of MANAGE_GUILD) and bot creator
	//2 - Bot creator
	'swiki': {
		level: 1,
		process: (bot, msg, args) => {
			let wiki = args[0];
			if (Object.keys(wikis).includes(wiki)) {
				sql.run('UPDATE guilds SET mainWiki=? WHERE id=?', wiki, msg.guild.id).then(() => {
					msg.reply(`the wiki of guild **${msg.guild.name}** is now set to **${wikis[wiki].longname}**`);
				});
			} else if (Object.keys(walias).includes(wiki)) {
				sql.run('UPDATE guilds SET mainWiki=? WHERE id=?', walias[wiki].wiki, msg.guild.id).then(() => {
					msg.reply(`the wiki of guild **${msg.guild.name}** is now set to **${wikis[walias[wiki].wiki].longname}**`);
				});
			} else {
				msg.reply('bad!');
			}
		}
	},
	'admin': {
		level: 2,
		process: (bot, msg) => {
			msg.reply('admin message issued.');
		}
	}
};

module.exports.commands = commands;
module.exports.aliases = aliases;
