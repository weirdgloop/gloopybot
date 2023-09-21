import { Harmony, SQLite, Table } from '../deps.ts';
import { ExtendedClient, getWikiKeyForInput } from './modules.ts';
import { wikis } from './data/wikis.ts';
import * as query from './database.ts';

interface BotCommand {
    description: string,
    restricted: boolean,
    excludeFromHelp?: boolean,
    execute(client: ExtendedClient, message: Harmony.Message, db: SQLite.DB, args: string[]): void
}

export const commands: Record<string, BotCommand> = {
    'help': {
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
            
            message.reply('```\n' + table.render() + '\n```');
            message.channel.send('```\n' + footer + '\n```');
        }
    },
    'wiki': {
        description: 'Set the wiki for the entire server.',
        restricted: true,
        execute(client, message, db, args) {
            const wikiKey = getWikiForArgZero(client, message, args[0]);
            if (wikiKey === '') return;

            if (message.guildID) {
                query.setGuildWiki(message.guildID, wikiKey, db);
                message.reply(`This guild's default wiki has been changed to **${wikis[wikiKey].name}**.`);
                return;
            }
            
            if (message.channel.isDM() || message.channel.isGroupDM()) {
                query.setDMWiki(message.channelID, wikiKey, db);
                message.reply(`The default wiki for this DM has been changed to **${wikis[wikiKey].name}**.`);
                return;
            }

            message.reply('You can\'t set a default wiki here.');
        }
    },
    'override': {
        description: 'Set the override wiki for the current channel.',
        restricted: true,
        execute(client, message, db, args) {
            if (message.channel.isDM() || message.channel.isGroupDM()) {
                message.reply('You can\'t use this command in DMs.');
                return;
            }

            const wikiKey = getWikiForArgZero(client, message, args[0]);
            if (wikiKey === '') {return;}

            if (message.guildID) {
                if (query.getGuildWiki(message.guildID, db) === wikiKey) {
                    query.deleteChannelOverride(message.guildID, message.channelID, db);
                } else {
                    query.setChannelOverride(message.guildID, message.channelID, wikiKey, db);
                }
                message.reply(`This channel's override has been changed to **${wikis[wikiKey].name}**.`);
                return;
            }
                
            message.reply('You can\'t set a default wiki here.');
        }
    },
    'userwiki': {
        description: 'Set your own personal override. Set to "default" to reset.',
        restricted: false,
        execute(client, message, db, args) {
            if (args[0] && args[0] === 'default') {
                query.deleteUserOverride(message.author.id, db);
                message.reply('Your user override has been deleted.');
                return;
            }

            const wikiKey = getWikiForArgZero(client, message, args[0]);
            if (wikiKey === '') return;
            query.setUserOverride(message.author.id, wikiKey, db);
            message.reply(`Your personal override has been set to **${wikis[wikiKey].name}**.`);
        }
    },
    'config': {
        description: 'Show the configuration of the current guild.',
        restricted: true,
        execute(_client, message, db) {
            const mainTable = new Table.default();
            mainTable.setHeading('Key', 'Value');

            if (message.channel.isDM() || message.channel.isGroupDM()) {
                mainTable.addRowMatrix([
                    ['Channel ID', message.channel.id],
                    ['Channel wiki', wikis[query.getDMWiki(message.channel.id, db) || ''].name || 'Not set']
                ]);
                message.reply('```\n' + mainTable.render() + '\n```');
                return;
            }
            
            if (message.guildID) {
                mainTable.addRowMatrix([
                    ['Guild ID', message.guildID],
                    ['Guild wiki', wikis[query.getGuildWiki(message.guildID, db) || ''].name || 'Not set']
                ]);
                const overrideTable = new Table.default().setHeading('Channel name', 'Override');
                overrideTable.addRowMatrix(query.getGuildChannelOverrides(message.guildID, db));
                message.reply('```\n' + mainTable.render() + '\n\n' + overrideTable.render() + '\n```');
                return;
            }
                
            message.reply('This command cannot be used in the current context.');
        }
    },
    'restart': {
        description: 'Restart the bot.',
        restricted: true,
        excludeFromHelp: true,
        execute(client, message) {
            if (message.author.id !== client.owner) {
                message.reply('Nothing interesting happens.');
                return;
            }

            Deno.exit(1337);
        }
    },
    'list': {
        description: 'List all available wikis.',
        restricted: false,
        execute(_client, message) {
            let fullList = '```\n'
            for (const wiki of Object.keys(wikis)) {
                fullList += `* ${wikis[wiki].name} (${wikis[wiki].url}) with aliases ${wiki}, ${wikis[wiki].aliases.join(', ')}\n`;
            }
            fullList += '\nAliases prefixed with a + can only be used for changing settings and not as one-time prefixes when creating links.\n```';
            message.reply(fullList);
        }
    },
    'invite': {
        description: 'Get an invite link to add the bot to your own server.',
        restricted: false,
        execute(_client, message) {
            message.reply('You can add the bot to your own server using the following link: <https://nvld.krd/gloopybot>');
        }
    }
}

const getWikiForArgZero = (client: ExtendedClient, message: Harmony.Message, argZero?: string): string => {
    if (!argZero) {
        message.reply(`Please specify the wiki you want to use. Example: \`${client.prefix}wiki rs3\``);
        return '';
    }

    const wikiKey = getWikiKeyForInput(argZero);
    if (!wikiKey) {
        message.reply(`The wiki ${argZero} was not found. Please use the \`${client.prefix}list\` command to view which wikis are valid for this command.`);
        return '';
    }

    return wikiKey;
}