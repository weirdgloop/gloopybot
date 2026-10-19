# GloopyBot

GloopyBot is a Discord linking bot for [runescape.wiki](https://runescape.wiki),
[oldschool.runescape.wiki](https://oldschool.runescape.wiki),
[meta.weirdgloop.org](https://meta.weirdgloop.org), and other Weird Gloop wikis.

[Add GloopyBot to your Discord server](https://nvld.krd/gloopybot).

## Rewrite status

The Node.js rewrite lives in `src/`. The existing `deno/` implementation is kept
as a behavior reference while features are migrated.

The main link flows are:

- Use `/help` for private usage details.
- Use `/migration` for details on the upcoming change to automatic message scanning.
- Mention GloopyBot in a message containing `[[page]]`, `{{template}}`, or
  `--page--` syntax to link it in the channel.
- Use the **Find wiki links** message context command on a message to link its
  wiki markup in a public response.
- Use `/wiki` with a page name, optional wiki choice, and optional `normal`,
  `template`, or `raw` type. Without a wiki choice it uses your configured
  user, channel, server, or DM setting.

Use `/setwiki where which` to configure a server default, the current channel's
wiki, or your personal override. Choose **Clear setting** to remove the selected
setting. Server and server-channel changes require the Manage Server permission,
the server owner, or the configured bot owner; anyone can change their own personal
override. In a DM, `where: channel` sets or clears that DM's wiki. The Node.js
rewrite keeps the Deno implementation's four SQLite tables (`guilds`,
`overrides`, `userOverride`, and `dms`) and does not run a schema migration.

While transitioning from Deno, the Node bot requests `Guilds`, `GuildMessages`,
`DirectMessages`, and the privileged `MessageContent` intent so it can preserve
automatic links from unmentioned server messages. Enable Message Content Intent
for the application in Discord's developer settings. When that intent is removed,
the bot will rely on mentions, the message context command, and `/wiki` instead.
Run `/migration` for details. [Discord Gateway docs](https://github.com/discord/discord-api-docs/blob/main/developers/events/gateway.mdx)

## Requirements

- Node.js 24.17.0 or newer (the checked-in `.nvmrc` selects 24.19.0)
- A Discord application and bot token

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`,
   and `DISCORD_GUILD_ID`.
3. Set `DATABASE_PATH` to the current bot's SQLite file if it is not at
   `deno/data.db`.
4. Start the bot with `npm start`. When `DISCORD_GUILD_ID` is set, startup updates
   the guild command list before connecting.

Run `npm run deploy:commands` to register commands without starting the bot.
When `DISCORD_GUILD_ID` is set, this updates that guild; when it is unset, it
registers globally. Guild and global commands are separate sets, so old global
testing commands remain visible until the global set is updated or removed.

When installing the app, enable the `bot` and `applications.commands` OAuth scopes.
