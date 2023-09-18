import { Harmony, SQLite, Table } from '../deps.ts';
import { ExtendedClient } from './modules.ts';
import { wikis } from './data/wikis.ts';
import * as query from './database.ts'; 

interface BotCommand {
    description: string,
    restricted: boolean,
    excludeFromHelp?: boolean,
    execute(client: ExtendedClient, message: Harmony.Message, db: SQLite.DB, args: string[]): void
}

export const commands: {[key: string]: BotCommand} = {
    "help": {
        description: 'Get a full list of bot commands.',
        restricted: false,
        execute(_client, message) {
            const table = new Table.default();
            table.setAlign(0, Table.AsciiAlign.RIGHT).setHeading('Command', 'Admin only', 'Description');
            for (const command of Object.keys(commands)) {
                if (commands[command].excludeFromHelp) continue;
                table.addRow(command, commands[command].restricted ? 'Yes' : 'No', commands[command].description);
            }
            const footer = '\nLinking syntax:\n* < [[term]] > uses the API to search for the page\n* < {{term}} > uses the API to search for the template\n* < --term-- > links to the page no matter' +
            ' what, which means the page may not exist.\n\nOne-time overrides:\n* You can use the name of the wiki before a link to apply it to a different wiki than the' +
            ' default one for the channel.\n* For example, in a channel where the default is the RS3 wiki, <[[osrs:Bucket]]> links to the OSRS version of the page.\n\n' +
            'Privacy policy:\nThe privacy policy for GloopyBot can be found at <https://invalid.cards/gloopybot/>.';
            message.reply('```\n' + table.render() + footer + '\n```');
        }
    },
    "wiki": {
        description: 'Set the wiki for the entire server.',
        restricted: true,
        execute(client, message, db, args) {
            const wikiKey = getWikiForArg0(client, message, args[0]);
            if (wikiKey === '') return;

            if (message.guildID) {
                query.setGuildWiki(message.guildID, wikiKey, db);
                message.reply(`This guild's default wiki has been changed to ${wikis[wikiKey].name}.`)
            } else if (message.channel.isDM()) {
                query.setDMWiki(message.channelID, wikiKey, db);
                message.reply(`The default wiki for this DM has been changed to ${wikis[wikiKey].name}.`)
            } else {
                message.reply('You can\'t set a default wiki here.');
            }
        }
    },
    "override": {
        description: 'Set the override wiki for the current channel.',
        restricted: true,
        execute(client, message, db, args) {
            if (message.channel.isDM()) {
                message.reply('You can\'t use this command in DMs.');
                return;
            }

            const wikiKey = getWikiForArg0(client, message, args[0]);
            if (wikiKey === '') return;

            if (message.guildID) {
                if (query.getGuildWiki(message.guildID, db) === wikiKey) {
                    query.deleteChannelOverride(message.guildID, message.channelID, db);
                } else {
                    query.setChannelOverride(message.guildID, message.channelID, wikiKey, db);
                }
                message.reply(`This channel's override has been changed to ${wikis[wikiKey].name}.`);
            } else {
                message.reply('You can\'t set a default wiki here.');
            }
        }
    },
    "config": {
        description: 'Show the configuration of the current guild. Note that this may show channels that are not accessible to all users.',
        restricted: true,
        execute(_client, message, db) {
            const mainTable = new Table.default();
            mainTable.setHeading('Key', 'Value');
            if (message.channel.isDM()) {
                mainTable.addRowMatrix([
                    ['Channel ID', message.channel.id],
                    ['Channel wiki', wikis[query.getDMWiki(message.channel.id, db) || ''].name || 'Not set']
                ]);
                message.reply('```\n' + mainTable.render() + '\n```');
            } else if (message.guildID) {
                mainTable.addRowMatrix([
                    ['Guild ID', message.guildID],
                    ['Guild wiki', wikis[query.getGuildWiki(message.guildID, db) || ''].name || 'Not set']
                ]);
                const overrideTable = new Table.default().setHeading('Channel name', 'Override');
                overrideTable.addRowMatrix(query.getGuildChannelOverrides(message.guildID, db));
                message.reply('```\n' + mainTable.render() + '\n\n' + overrideTable.render() + '\n```');
            } else {
                message.reply('This command cannot be used in the current context.');
            }
        }
    },
    "restart": {
        description: 'Restart the bot.',
        restricted: true,
        excludeFromHelp: true,
        execute(client, message) {
            if (message.author.id !== client.owner) {
                message.reply("I'm sorry, Dave. I can't let you do that.");
                return;
            }
            Deno.exit(1337);
        }
    }
}

const getWikiKeyForInput = (input: string) => {
    if (Object.keys(wikis).includes(input)) return input;
    Object.entries(wikis).forEach(entry => {
        if (entry[1].aliases.includes(input.replace('+', ''))) return entry[0];
    });
}

const getWikiForArg0 = (client: ExtendedClient, message: Harmony.Message, arg0?: string): string => {
    if (!arg0) {
        message.reply(`Please specify the wiki you want to use. Example: \`${client.prefix}wiki rs3\``);
        return '';
    }

    const wikiKey = getWikiKeyForInput(arg0);
    if (!wikiKey) {
        message.reply(`The wiki ${arg0} was not found. Please use the \`${client.prefix}list\` command to view which wikis are valid for this command.`);
        return '';
    }

    return wikiKey;
}