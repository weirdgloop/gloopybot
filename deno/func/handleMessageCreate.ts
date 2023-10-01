import { Harmony, SQLite } from '../deps.ts';
import { ExtendedClient, commands, LinkHandler } from './modules.ts'

export const handleMessageCreate = async (bot: ExtendedClient, message: Harmony.Message, db: SQLite.DB) => {
    if (message.author.bot) return;

    if (!botHasSendMessagePerms(message)) {
        return; //don't have message send permissions, so early quits. can't do much without it! saves some error logs ig.
    }

    if (message.content.startsWith(bot.prefix)) {
        await handleCommand(bot, message, db);
        return;
    }

    await LinkHandler.makeLinks(bot, message, db);
}

const messageAuthorIsAdmin = async (bot: ExtendedClient, message: Harmony.Message) => {
    if (message.author.id === bot.owner) return true;
    if (await memberHasRoleWithAdmin(message.member)) return true;
    if (message.channel.isDM() || message.channel.isGroupDM()) return true;
    return false;
}

const handleCommand = async (bot: ExtendedClient, message: Harmony.Message, db: SQLite.DB) => {
    const [cmd, ...args] = message.content.replace(bot.prefix, '').split(' ');
    if (!commands[cmd]) {
        message.reply(`Command "${cmd}" not found!`);
        return;
    }

    if (commands[cmd].restricted && !(await messageAuthorIsAdmin(bot, message))) {
        if (commands[cmd].excludeFromHelp) message.reply(`Command "${cmd}" not found!`);
        else message.reply(`You are not permitted to run the "${cmd}" command.`);
        return;
    }

    commands[cmd].execute(bot, message, db, args);
};

const botHasSendMessagePerms = async (message: Harmony.Message) => {
    if (message.channel.isGuildTextBased()) {
        return (await message.channel.guild.me()).permissions.has(Harmony.PermissionFlags.SEND_MESSAGES, true);
    }

    if (message.channel.isDM() || message.channel.isGroupDM()) {
        return true;
    }

    return false;
}

const memberHasRoleWithAdmin = async (member?: Harmony.Member) => {
    if (!member) return false;

    let found = false;
    const roles = await member.roles.array();

    for (const role of roles) {
        if (role.permissions.has(Harmony.PermissionFlags.ADMINISTRATOR)) {
            found = true;
        }
    }

    return found;
}