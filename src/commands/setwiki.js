'use strict';

const { SlashCommandBuilder } = require('discord.js');
const {
  clearDMWiki,
  clearGuildWiki,
  deleteChannelOverride,
  deleteUserOverride,
  setChannelOverride,
  setDMWiki,
  setGuildWiki,
  setUserOverride
} = require('../database');
const { wikis } = require('../data/wikis');
const { canManageServerWiki } = require('../permissions');

const wikiChoices = Object.entries(wikis).map(([key, wiki]) => ({
  name: wiki.name,
  value: key
}));
wikiChoices.push({ name: 'Clear setting', value: 'clear' });

const whereChoices = [
  { name: 'Server', value: 'server' },
  { name: 'Channel', value: 'channel' },
  { name: 'User', value: 'user' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwiki')
    .setDescription('Set or clear the wiki for a server, channel, or yourself.')
    .addStringOption((option) => option
      .setName('where')
      .setDescription('Choose which setting to change.')
      .setRequired(true)
      .addChoices(...whereChoices))
    .addStringOption((option) => option
      .setName('which')
      .setDescription('Choose a wiki, or clear the selected setting.')
      .setRequired(true)
      .addChoices(...wikiChoices)),

  /** Apply a wiki choice or clear operation at the requested user, channel, or server scope. */
  async execute(interaction) {
    const where = interaction.options.getString('where', true);
    const which = interaction.options.getString('which', true);
    const shouldClear = which === 'clear';
    const wikiName = shouldClear ? undefined : wikis[which].name;

    if (where === 'user') {
      if (shouldClear) {
        deleteUserOverride(interaction.user.id);
        return { status: 'reply', content: 'Your personal wiki override has been cleared.' };
      }

      setUserOverride(interaction.user.id, which);
      return { status: 'reply', content: `Your personal wiki is now **${wikiName}**.` };
    }

    if (where === 'server') {
      if (!interaction.guildId) {
        return { status: 'reply', content: 'Server wiki settings are only available in a server.' };
      }
      if (!canManageServerWiki(interaction)) {
        return { status: 'reply', content: 'You need the Manage Server permission to change the server wiki setting.' };
      }

      if (shouldClear) {
        clearGuildWiki(interaction.guildId);
        return { status: 'reply', content: "This server's default wiki setting has been cleared." };
      }

      setGuildWiki(interaction.guildId, which);
      return { status: 'reply', content: `This server's default wiki is now **${wikiName}**.` };
    }

    if (interaction.guildId && !canManageServerWiki(interaction)) {
      return { status: 'reply', content: 'You need the Manage Server permission to change this channel wiki setting.' };
    }

    if (!interaction.guildId) {
      if (shouldClear) {
        clearDMWiki(interaction.channelId);
        return { status: 'reply', content: 'The default wiki setting for this DM has been cleared.' };
      }

      setDMWiki(interaction.channelId, which);
      return { status: 'reply', content: `The default wiki for this DM is now **${wikiName}**.` };
    }

    if (shouldClear) {
      deleteChannelOverride(interaction.guildId, interaction.channelId);
      return { status: 'reply', content: 'This channel now uses the server wiki settings.' };
    }

    setChannelOverride(interaction.guildId, interaction.channelId, which);
    return { status: 'reply', content: `This channel's wiki is now **${wikiName}**.` };
  }
};
