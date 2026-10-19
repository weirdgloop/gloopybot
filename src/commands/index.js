'use strict';

const ping = require('./ping');
const help = require('./help');
const migration = require('./migration');
const wiki = require('./wiki');
const setWiki = require('./setwiki');
const findWikiLinks = require('./find-wiki-links');

// Keep registration lists and runtime lookup maps together so both use the same command set.
const commands = [ping, help, migration, wiki, setWiki];
const messageCommands = [findWikiLinks];

module.exports = {
  commands,
  messageCommands,
  commandByName: new Map(commands.map((command) => [command.data.name, command])),
  messageCommandByName: new Map(messageCommands.map((command) => [command.data.name, command])),
  buttonHandlerById: new Map(help.buttonHandlers)
};
