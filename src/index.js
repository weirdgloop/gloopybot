'use strict';

const {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials
} = require('discord.js');
const { requireEnv } = require('./config');
const { databasePath } = require('./database');
const { buttonHandlerById, commandByName, messageCommandByName } = require('./commands');
const { registerCommands } = require('./command-registration');
const { lookupMessageContent } = require('./linking');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Transitional: remove this intent when automatic server-message scanning ends.
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, (readyClient) => {
  console.info(`Ready as ${readyClient.user.tag}.`);
  console.info(`Using SQLite database at ${databasePath}.`);
  readyClient.user.setActivity('Gloopin\' • /help', { type: ActivityType.Playing });
});

// Route slash commands, message context commands, and help buttons through one reply lifecycle.
client.on(Events.InteractionCreate, async (interaction) => {
  const context = {
    userId: interaction.user.id,
    guildId: interaction.guildId ?? undefined,
    channelId: interaction.channelId
  };

  let command;
  let buttonHandler;
  if (interaction.isChatInputCommand()) {
    command = commandByName.get(interaction.commandName);
  } else if (interaction.isMessageContextMenuCommand()) {
    command = messageCommandByName.get(interaction.commandName);
  } else if (interaction.isButton()) {
    buttonHandler = buttonHandlerById.get(interaction.customId);
  } else {
    return;
  }
  if (!command && !buttonHandler) return;

  try {
    if (command?.ephemeral || buttonHandler) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } else {
      await interaction.deferReply();
    }
    const result = buttonHandler
      ? await buttonHandler(interaction, context)
      : await command.execute(interaction, context);
    const reply = { allowedMentions: { parse: [] } };
    if (result?.embeds?.length) reply.embeds = result.embeds;
    if (result?.components?.length) reply.components = result.components;

    const content = result?.content
      ?? (result?.embeds?.length ? undefined : getInteractionReply(result, interaction));
    if (content !== undefined) reply.content = content;

    await interaction.editReply(reply);
  } catch (error) {
    console.error(`Interaction ${interaction.commandName ?? interaction.customId} failed:`, error);

    const reply = {
      content: 'There was a problem running that command.',
      allowedMentions: { parse: [] },
      flags: MessageFlags.Ephemeral
    };

    if (interaction.deferred) {
      await interaction.editReply({
        content: reply.content,
        allowedMentions: reply.allowedMentions
      }).catch(console.error);
    } else if (interaction.replied) {
      await interaction.followUp(reply).catch(console.error);
    } else {
      await interaction.reply(reply).catch(console.error);
    }
  }
});

// Preserve legacy link scanning during the transition and redirect old text commands to slash commands.
client.on(Events.MessageCreate, async (message) => {
  if (!message.content.trim()) return; // Always ignore empty first; this will be most common when Message Content intent is removed
  if (message.author.bot || !client.user) return;

  const onlyBotMention = message.mentions.users.has(client.user.id)
    && message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim() === '';
  if (message.reference?.messageId && onlyBotMention) {
    await message.reply({
      content: 'I can\'t see the content of the message you replied to. Right-click that original message and choose **Apps → GloopyBot → Find wiki links** to have it parsed.',
      allowedMentions: { parse: [] }
    }).catch((error) => {
      console.error('Could not send referenced-message guidance:', error);
    });
    return;
  }

  const legacyCommandReply = getLegacyCommandReply(message.content);
  if (legacyCommandReply !== undefined) {
    if (legacyCommandReply) {
      await message.reply({
        content: legacyCommandReply,
        allowedMentions: { parse: [] }
      }).catch((error) => {
        console.error('Could not send legacy command guidance:', error);
      });
    }
    return;
  }

  const isDirectMessage = !message.guildId;
  const mentionsBot = message.mentions.users.has(client.user.id);
  const migrationWarning = !isDirectMessage && !mentionsBot
    ? '\n> ⚠️ Linking will change from 1 January 2027. Use `/migration` for details.'
    : '';

  const result = await lookupMessageContent(message.content, {
    userId: message.author.id,
    guildId: message.guildId ?? undefined,
    channelId: message.channelId,
    migrationWarning
  });

  if (result.status === 'links' || result.status === 'too-long' || result.status === 'not-configured' || result.status === 'error' || (result.status === 'no-results' && result.limited)) {
    await message.channel.send(result.content).catch((error) => {
      console.error('Could not send wiki-link response:', error);
    });
  }
});

/** Return migration guidance for a recognized `g!` command; an empty string means silently ignore it. */
function getLegacyCommandReply(content) {
  const [command] = content.trim().split(/\s+/, 1);
  const legacyCommand = command?.startsWith('g!')
    ? command.slice(2).toLowerCase()
    : '';

  const replacements = {
    help: 'Use `/help` for current usage details and helpful buttons.',
    wiki: 'Use `/setwiki` with `where: Server` to change the server default wiki.',
    override: 'Use `/setwiki` with `where: Channel` to change this channel’s wiki.',
    userwiki: 'Use `/setwiki` with `where: User` to change your personal wiki.',
    config: 'Use `/help` and select **Server configuration**.',
    list: 'Use `/help` and select **List wikis**.',
    invite: 'Use `/help` and select **Invite**.'
  };

  if (legacyCommand === 'restart' || legacyCommand === 'migrate') return '';
  return replacements[legacyCommand];
}

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

/** Register commands in the configured test guild (when set), then connect the bot. */
async function start() {
  const token = requireEnv('DISCORD_TOKEN');
  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  if (guildId) {
    const { count, scope } = await registerCommands(guildId);
    console.info(`Registered ${count} command(s) ${scope}.`);
  }

  await client.login(token);
}

/** Convert a lookup result status into user-facing fallback text for interactions. */
function getInteractionReply(result, interaction) {
  if (result?.content) return result.content;

  if (result?.status === 'no-links') {
    return 'I did not find wiki-link markup in that message. Use `/wiki` for a page title.';
  }

  if (result?.status === 'no-results') {
    if (interaction.isChatInputCommand()) {
      const query = interaction.options.getString('query', true);
      const wikiName = result.wikiName ? ` on ${result.wikiName}` : '';
      return `No wiki page was found for “${query}”${wikiName}. You can use the raw link type to create a link anyway.`;
    }
    if (result.limited) {
      return 'No wiki pages were found among the first 10 links in that message. Any remaining links were left unchecked.';
    }
    return 'No wiki pages were found in that message.';
  }

  if (result?.status === 'error') {
    return result.content ?? 'The wiki lookup failed. Please try again in a moment.';
  }

  if (result?.status === 'no-query') {
    return 'Enter a page name to look up.';
  }

  return 'The wiki lookup did not return a result.';
}

start().catch((error) => {
  console.error('Failed to start GloopyBot:', error);
  process.exitCode = 1;
});
