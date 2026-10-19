'use strict';

const {
  ApplicationCommandType,
  ContextMenuCommandBuilder
} = require('discord.js');
const { lookupMessageContent } = require('../linking');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Find wiki links')
    .setType(ApplicationCommandType.Message),

  /** Look up supported link markup in the message selected from Discord's context menu. */
  async execute(interaction, context) {
    return lookupMessageContent(interaction.targetMessage.content, context);
  }
};
