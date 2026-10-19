'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { lookupWikiCommand } = require('../linking');
const { wikis } = require('../data/wikis');

const wikiChoices = Object.entries(wikis).map(([key, wiki]) => ({
  name: wiki.name,
  value: key
}));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wiki')
    .setDescription('Find a page on a selected or configured wiki.')
    .addStringOption((option) => option
      .setName('query')
      .setDescription('The page name, without wiki-link brackets.')
      .setRequired(true))
    .addStringOption((option) => option
      .setName('wiki')
      .setDescription('Choose a wiki instead of using your configured default.')
      .setRequired(false)
      .addChoices(...wikiChoices))
    .addStringOption((option) => option
      .setName('type')
      .setDescription('Choose how to make the link.')
      .setRequired(false)
      .addChoices(
        { name: 'Normal search', value: 'normal' },
        { name: 'Template', value: 'template' },
        { name: 'Raw link', value: 'raw' }
      )),

  /** Search the configured or selected wiki and return a normal, template, or raw link. */
  async execute(interaction, context) {
    const query = interaction.options.getString('query', true);
    const type = interaction.options.getString('type') ?? 'normal';
    const wikiKey = interaction.options.getString('wiki');
    return lookupWikiCommand(query, type, context, wikiKey);
  }
};
