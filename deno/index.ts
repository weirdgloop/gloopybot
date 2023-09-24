import { Harmony, SQLite, loadenv } from './deps.ts';
import { handleMessageCreate, setupBotDatabase, ExtendedClient } from './func/modules.ts';

const db = new SQLite.DB('./data.db');
const env = await loadenv();

const bot = new ExtendedClient(env['OWNER_ID'], env['PREFIX'], {
    intents: [
        Harmony.GatewayIntents.GUILDS,
        Harmony.GatewayIntents.DIRECT_MESSAGES,
        Harmony.GatewayIntents.GUILD_MESSAGES,
        Harmony.GatewayIntents.MESSAGE_CONTENT
    ]
});

bot.on('ready', async () => {
    setupBotDatabase(db);
    bot.setPresence({type: 'PLAYING', name: `with gloop | ${bot.prefix}help`});
    console.log(`Ready with Deno! Serving ${await bot.guilds.size()} guilds.`);
});

bot.on('messageCreate', async (message) => {
    await handleMessageCreate(bot, message, db);
});

bot.connect(env['DISCORD_TOKEN']);