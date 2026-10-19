'use strict';

const { registerCommands } = require('./command-registration');

// This one-off script deploys to DISCORD_GUILD_ID when set, or globally otherwise.
const guildId = process.env.DISCORD_GUILD_ID?.trim();

registerCommands(guildId)
  .then(({ count, scope }) => console.info(`Registered ${count} command(s) ${scope}.`))
  .catch((error) => {
    console.error('Failed to register application commands:', error);
    process.exitCode = 1;
  });
