import { Harmony, SQLite } from './deps.ts';
import { load } from 'https://deno.land/std@0.197.0/dotenv/mod.ts';
import { handleMessageCreate, setupBotDatabase, ExtendedClient } from './func/modules.ts';

const db = new SQLite.DB('../bits/data.db');
const env = await load();

const bot = new ExtendedClient({
    intents: [
        Harmony.GatewayIntents.GUILDS,
        Harmony.GatewayIntents.DIRECT_MESSAGES,
        Harmony.GatewayIntents.GUILD_MESSAGES,
        Harmony.GatewayIntents.MESSAGE_CONTENT
    ]
});
bot.owner = env['OWNER_ID'];
bot.prefix = env['PREFIX'];

bot.on('ready', async () => {
    setupBotDatabase(db);
    bot.setPresence({type: 'PLAYING', name: `with gloop | ${bot.prefix}help`});
    console.log(`Ready with Deno! Serving ${await bot.guilds.size()} guilds.`);
});

bot.on('messageCreate', (message) => {
    handleMessageCreate(bot, message, db);
});

bot.connect(env['DISCORD_TOKEN']);