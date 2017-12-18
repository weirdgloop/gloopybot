//requires

const aliases = {
	//TBI
};

const commands = {
	//Levels of permission:
	//0 - Everyone
	//1 - Server admins (permission of MANAGE_GUILD) and bot creator
	//2 - Bot creator
	'help': {
		level: 0,
		process: (bot, msg) => {
			msg.reply('there is no help for you.');
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
