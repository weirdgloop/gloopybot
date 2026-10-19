'use strict';

const { PermissionFlagsBits } = require('discord.js');

/** Allow server wiki changes to managers, the server owner, or the configured bot owner. */
function canManageServerWiki(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    || interaction.guild?.ownerId === interaction.user.id
    || process.env.OWNER_ID === interaction.user.id;
}

module.exports = { canManageServerWiki };
