import { Harmony, SQLite } from '../deps.ts';
import { ExtendedClient, commands } from './modules.ts'

export const handleMessageCreate = (bot: ExtendedClient, message: Harmony.Message, db: SQLite.DB) => {
    if (message.content.startsWith(bot.prefix)) {
        handleCommand(bot, message, db);
        return;
    }
    makeLink(bot, message, db);
}

const messageAuthorIsAdmin = (bot: ExtendedClient, message: Harmony.Message) => {
    if (message.author.id === bot.owner) return true;
    if (message.member?.permissions.has(Harmony.PermissionFlags.ADMINISTRATOR)) return true;
    if (message.channel.isDM()) return true;
    return false;
}

const handleCommand = (bot: ExtendedClient, message: Harmony.Message, db: SQLite.DB) => {
    const [cmd, ...args] = message.content.replace(bot.prefix, '').split(' ');
    if (!commands[cmd]) {
        message.reply(`Command "${cmd}" not found!`);
        return;
    }

    if (commands[cmd].restricted && !messageAuthorIsAdmin(bot, message)) {
        if (commands[cmd].excludeFromHelp) message.reply(`Command "${cmd}" not found!`);
        else message.reply(`You are not permitted to run the "${cmd}" command.`);
        return;
    }

    commands[cmd].execute(bot, message, db, args);
};

const makeLink = (bot: ExtendedClient, message: Harmony.Message, db: SQLite.DB) => {

};