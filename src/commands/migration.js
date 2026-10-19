'use strict';

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('migration')
    .setDescription('See how GloopyBot link behavior is changing.'),

  /** Explain the upcoming behavior change and the supported ways to request links. */
  async execute() {
    return {
      embeds: [new EmbedBuilder()
        .setColor(0xE0A12B)
        .setTitle('Changes to how GloopyBot finds links')
        .setDescription('Due to Discord permission changes, starting 1 January 2027, GloopyBot will stop automatically checking every server message for wiki links. DM messages are not impacted by this change.')
        .addFields(
          {
            name: 'Until then',
            value: 'Posting `[[page]]`, `{{template}}`, or `--page--` in a server can make GloopyBot reply with a link, even if you do not mention it.'
          },
          {
            name: 'After 1 January 2027 (and already available now!)',
            value: [
              '• @GloopyBot in a message with wiki markup to get a link.',
              '• Right-click a message, choose **Apps → GloopyBot → Find wiki links**, and GloopyBot will post its links in the channel.',
              '• Use `/wiki` with a page name. You can optionally choose a wiki and link type.'
            ].join('\n')
          }
        )]
    };
  }
};
