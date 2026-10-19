'use strict';

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check whether GloopyBot is responding.'),

  /** Return a lightweight response for checking that the bot is available. */
  async execute() {
    return { status: 'reply', content: 'Pong!' };
  }
};
