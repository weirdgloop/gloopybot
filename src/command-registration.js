'use strict';

const { REST, Routes } = require('discord.js');
const { requireEnv } = require('./config');
const { commands, messageCommands } = require('./commands');

/** Replace this application's registered commands globally or for one development guild. */
async function registerCommands(guildId) {
  const token = requireEnv('DISCORD_TOKEN');
  const clientId = requireEnv('DISCORD_CLIENT_ID');
  const rest = new REST({ version: '10' }).setToken(token);
  const body = [...commands, ...messageCommands].map((command) => command.data.toJSON());
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);

  await rest.put(route, { body });
  return {
    count: body.length,
    scope: guildId ? `guild ${guildId}` : 'globally'
  };
}

module.exports = { registerCommands };
