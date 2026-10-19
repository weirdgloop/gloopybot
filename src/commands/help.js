'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} = require('discord.js');
const { getDMWiki, getGuildChannelOverrides, getGuildWiki } = require('../database');
const { wikis } = require('../data/wikis');
const { canManageServerWiki } = require('../permissions');

const helpButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('help:config')
    .setLabel('Server configuration')
    .setStyle(ButtonStyle.Secondary),
  new ButtonBuilder()
    .setCustomId('help:list')
    .setLabel('List available wikis')
    .setStyle(ButtonStyle.Secondary),
  new ButtonBuilder()
    .setCustomId('help:invite')
    .setLabel('Bot invite')
    .setStyle(ButtonStyle.Secondary),
  new ButtonBuilder()
    .setLabel('Privacy Policy')
    .setStyle(ButtonStyle.Link)
    .setURL('https://invalid.cards/gloopybot/')
);

/** Display a readable wiki name even when no key is configured. */
function wikiName(wikiKey) {
  return wikis[wikiKey]?.name ?? 'Not set';
}

/** Build the current DM or server configuration, chunking large override lists across embeds. */
function configEmbed(interaction) {
  if (!interaction.guildId) {
    const configuredWiki = getDMWiki(interaction.channelId);
    return [new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('DM configuration')
      .addFields({ name: 'DM default', value: `**${wikiName(configuredWiki)}**` })];
  }

  if (!canManageServerWiki(interaction)) {
    return undefined;
  }

  const configuredWiki = getGuildWiki(interaction.guildId);
  const overrides = getGuildChannelOverrides(interaction.guildId);
  const lines = overrides.map((override) => `<#${override.channelID}> — **${wikiName(override.wiki)}**`);
  const chunks = [];
  let chunk = '';

  for (const line of lines.length ? lines : ['None']) {
    const nextChunk = chunk ? `${chunk}\n${line}` : line;
    if (nextChunk.length > 1024) {
      chunks.push(chunk);
      chunk = line;
    } else {
      chunk = nextChunk;
    }
  }
  if (chunk) chunks.push(chunk);

  const embeds = [];
  for (let offset = 0; offset < chunks.length; offset += 4) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${interaction.guild?.name ?? 'Server'} configuration`);
    if (offset === 0) {
      embed.addFields({ name: 'Server default', value: `**${wikiName(configuredWiki)}**` });
    }
    embed.addFields(...chunks.slice(offset, offset + 4).map((value, index) => ({
      name: offset === 0 && index === 0 ? 'Channel overrides' : 'Channel overrides (continued)',
      value
    })));
    embeds.push(embed);
  }

  return embeds;
}

/** Button handler for configuration; enforce the same server-management permission as `/setwiki`. */
function showConfig(interaction) {
  const embed = configEmbed(interaction);
  if (!embed) {
    return { content: 'You need the Manage Server permission to view this server configuration.' };
  }
  return { embeds: embed };
}

/** Button handler that presents every configured wiki and its aliases. */
function showWikiList() {
  const wikiFields = Object.entries(wikis).map(([key, wiki]) => {
    const aliases = [key, ...wiki.aliases.filter((alias) => !alias.startsWith('+'))]
      .map((alias) => `\`${alias}\``)
      .join(', ');
    return {
      name: wiki.name,
      value: `${wiki.url}\nAliases: ${aliases}`,
      inline: true
    };
  });
  const fields = [];
  wikiFields.forEach((field, index) => {
    fields.push(field);
    if (index % 2 === 1 && index < wikiFields.length - 1) {
      // Inline embed fields fill three columns; a blank field reserves the third column.
      fields.push({ name: '\u200B', value: '\u200B', inline: true });
    }
  });

  return {
    embeds: [new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Available wikis')
      .addFields(fields)]
  };
}

/** Button handler that presents the bot invite URL. */
function showInvite() {
  return {
    embeds: [new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Add GloopyBot to your server')
      .setURL('https://nvld.krd/gloopybot')
      .setDescription('[Open the invite link](https://nvld.krd/gloopybot)')]
  };
}

const buttonHandlers = new Map([
  ['help:config', showConfig],
  ['help:list', showWikiList],
  ['help:invite', showInvite]
]);

module.exports = {
  ephemeral: true,
  buttonHandlers,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show how to use GloopyBot.'),

  /** Build the ephemeral help embed and its configuration/list/invite buttons. */
  async execute() {
    return {
      embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('GloopyBot Help')
        .setDescription('Use the buttons below for configuration, the wiki list, the invite link, or the privacy policy.')
        .addFields(
          {
            name: 'Find links',
            value: '• Mention GloopyBot with `[[page]]`, `{{template}}`, or `--page--`.\n• Right-click a message → **Apps → GloopyBot → Find wiki links**.',
            inline: false
          },
          {
            name: '/wiki',
            value: 'Search by page name. Wiki and link type are optional. Types: Normal (default), Template, or Raw. A prefix such as `osrs:` won’t change the target wiki.',
            inline: true
          },
          {
            name: '/setwiki',
            value: 'Choose a scope (Server, Channel, or User) and a wiki, or Clear setting. Server and channel changes require Manage Server, the server owner, or the bot owner.',
            inline: true
          },
          {
            name: 'Which wiki is used?',
            value: 'Your personal setting takes priority, then the channel setting, then the server setting. In DMs, the channel setting applies.',
            inline: false
          },
          {
            name: 'Upcoming change',
            value: '> ⚠️ Due to Discord permission changes, linking will work differently from 1 January 2027. Run `/migration` for details.',
            inline: false
          }
        )],
      components: [helpButtons]
    };
  }
};
