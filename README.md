# GloopyBot

GloopyBot is a Discord bot that turns wiki markup into links for RuneScape,
Weird Gloop, and other supported wikis. It runs on Node.js with Discord.js and
stores wiki settings in SQLite.

[Add GloopyBot to your Discord server](https://nvld.krd/gloopybot).

## Using the bot

- `/help` shows private usage instructions and buttons for configuration, the
  wiki list, and the invite link.
- `/wiki` looks up a page. Choose a wiki and link type, or leave them unset to
  use your configured default. The types are Normal, Template, and Raw. Use the
  wiki option to choose a wiki; a prefix such as `osrs:` in the query will not
  change the selected wiki.
- `/setwiki` sets or clears a wiki at the Server, Channel, or User scope. In a
  DM, choose Channel to set or clear that conversation's default.
- `/migration` explains the planned change to how the bot finds links.
- `/ping` checks that the bot is responding.
- Right-click a message and choose **Apps → GloopyBot → Find wiki links** to
  have the bot look up its wiki markup and post the results in the channel.

The bot recognizes `[[page]]` for a page search, `{{template}}` for a template
search, and `--page--` for a direct article link. It checks at most 10 distinct
wiki links from a message.

### Wiki settings

The effective wiki is chosen in this order: your personal setting, the current
channel setting, then the server setting. In DMs, your personal setting takes
priority over the DM channel setting.

Changing server or server-channel settings requires the Manage Server
permission, server ownership, or the configured bot owner. Anyone can set their
own personal wiki. In DMs, anyone can set the DM channel wiki.

## Discord message access

The bot currently checks messages for wiki markup, even when it is not
mentioned. This behavior requires the privileged **Message Content Intent** to
be enabled for the application in the Discord Developer Portal. The current
implementation requests that intent to preserve automatic linking during the
transition.

> [!WARNING]
> ⚠️ Starting 1 January 2027, the planned change is for server messages to be
> checked only when the bot is mentioned or a user explicitly selects **Find wiki links**.
`/wiki` remains available. Direct messages are not affected. Run `/migration` for
the user-facing explanation.

## Requirements

- Node.js 24.17 or newer (`.nvmrc` selects 24.19.0)
- A Discord application and bot token

## Run locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set `DISCORD_TOKEN` and
   `DISCORD_CLIENT_ID`. Set `OWNER_ID` to your Discord user ID if you want the
   bot-owner permission exception for server settings.
3. Create the database directory with `mkdir -p data`, then set
   `DATABASE_PATH=data/data.db`, or point `DATABASE_PATH` to an existing SQLite
   database. The bot uses the existing tables for guild defaults, channel
   overrides, personal settings, and DM settings; it does not migrate the
   database schema.
4. For development, set `DISCORD_GUILD_ID` to your test server. Starting with
   `npm start` will replace that server's registered commands before the bot
   connects.
5. Start the bot with `npm start`.

To register commands without starting the bot, run `npm run deploy:commands`.
With `DISCORD_GUILD_ID` set, it updates that server; without it, it replaces the
global command set. Guild and global commands are separate, so update each scope
where you have previously registered test commands.

When installing the app, enable the `bot` and `applications.commands` OAuth
scopes. Give the bot access to the channels where it should work, with permission
to view channels, send messages, and embed links. Enable Message Content Intent
in the Developer Portal while automatic message scanning is in use.
