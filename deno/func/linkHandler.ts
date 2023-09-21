import { Harmony, SQLite } from "../deps.ts";
import { ExtendedClient, getWikiKeyForInput } from "./modules.ts";
import { wikis } from "./data/wikis.ts";
import * as queries from "./database.ts";

type WikiSearchType = "search" | "template" | "hardlink";

interface WikiQuery {
    type: WikiSearchType,
    query: string,
    wikiKey: string
}

export const makeLinks = async (bot: ExtendedClient, message: Harmony.Message, db: SQLite.DB) => {
    let wikiKey = queries.getUserOverride(message.author.id, db);
    if (message.channel.isDM() || message.channel.isGroupDM()) {
        wikiKey = wikiKey || queries.getDMWiki(message.channelID, db);
    } else {
        wikiKey = wikiKey || queries.getChannelOverride(message.guildID!, message.channelID, db) || queries.getGuildWiki(message.guildID!, db);
    }

    const cleanedMessage = cleanMessageContent(message.content);

    const searchQueries = [...cleanedMessage.matchAll(/\[\[(.*?)(?:\|.*?)?\]\]/g)].map(arr => arr[1]).map(x => {return {query: x, type: "search", wikiKey: wikiKey || ''} as WikiQuery});
    const templateQueries = [...cleanedMessage.matchAll(/{{(.*?)(?:\|.*?)?}}/g)].map(arr => arr[1]).map(x => {return {query: x, type: "template", wikiKey: wikiKey || ''} as WikiQuery});
    const hardLinkQueries = [...cleanedMessage.matchAll(/--(.*?)(?:\|.*?)?--/g)].map(arr => arr[1]).map(x => {return {query: x, type: "hardlink", wikiKey: wikiKey || ''} as WikiQuery});
    if ((searchQueries.length > 0 || templateQueries.length > 0 || hardLinkQueries.length > 0) && !wikiKey) {
        message.reply(`GloopyBot has not yet been setup for this place. Check out the ${bot.prefix}help command for instructions to set the bot up, or ask an administrator in the server to do it for you.`);
        return;
    }

    const apiLinks = await handleAPIQueries([...searchQueries, ...templateQueries]);
    const hardLinks = handleHardlinkQueries([...hardLinkQueries]);

    if (apiLinks.length === 0 && hardLinks.length === 0) return;

    message.channel.send(`**Wiki links found:**\n${apiLinks}\n${hardLinks}`);
}

const cleanMessageContent = (content: string): string => {
    content = content.replace(/<!?@[0-9]+>/gm, ' '); //remove mentions
    content = content.replace(/`{3}(.|\n)+`{3}/gm, ' '); //remove multiline code blocks
    content = content.replace(/`+.*`+/gm, ' '); //remove inline code sections
    content = content.replace(/<?https?:\/\/[\w.\/#?&_-]*>?\s/gm, ' '); //remove links
    return content;
}

const parseWikiFromQuery = (query: WikiQuery) => {
    if (!query) return '';
    if (!query.query) return '';

    if (!/^.*?:/g.test(query.query)) return query.wikiKey;

    const matches = query.query.match(/^.*?:/g);
    if (!matches) return query.wikiKey;
    const potentialWiki = matches[0].replace(':', '').toLowerCase();
    const newKey = getWikiKeyForInput(potentialWiki);
    if (!newKey) return query.wikiKey;
    return newKey;
}

const handleAPIQueries = async (queries: WikiQuery[]): Promise<string> => {
    let returnString = '';
    for (const query of queries) {
        let search = query.query;
        if (query.type === 'template') search = `Template:${search}`;

        const actualWikiKey = parseWikiFromQuery(query);
        const wiki = wikis[actualWikiKey];
        if (!wiki) continue;

        if (actualWikiKey !== query.wikiKey) {
            search = search.split(':').slice(1).join(':');
        }

        let wikiUrl = wiki.url;
        if (wiki.apiSubdomain) wikiUrl += wiki.apiSubdomain;

        const searchUrl = `${wikiUrl}/api.php?action=opensearch&search=${wikiUrlEncode(search)}&redirects=resolve`;
        const resp = await fetch(searchUrl, {headers: {'User-Agent': 'GloopyBot 2.0'}, cache: 'no-cache'});
        if (!resp.ok) continue;

        const data = await resp.json();
        if (data[3] && data[3][0]) returnString += `\n<${fixDiscordLink(data[3][0])}>`;
    }
    return returnString.trim();
}

const handleHardlinkQueries = (queries: WikiQuery[]): string => {
    let returnString = '';
    for (const query of queries) {
        const actualWikiKey = parseWikiFromQuery(query);
        const wiki = wikis[actualWikiKey];
        if (!wiki) continue;

        if (actualWikiKey !== query.wikiKey) {
            query.query = query.query.split(':').slice(1).join(':');
        }

        const wikiUrl = `${wiki.url}${wiki.articleSubdomain ? wiki.articleSubdomain : '/w'}`;
        returnString += `\n<${wikiUrl}/${fixDiscordLink(wikiUrlEncode(query.query))}>`;
    }
    return returnString.trim();
}

const wikiUrlEncode = (url: string) => encodeURIComponent(url)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E')
    .replace(/%20/g, '_')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/')
    .replace(/\+/g, '%2B')
    .replace(/\@/g, '%40');

const fixDiscordLink = (url: string) => url.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/%23/g, '#').replace(/ /g, '_');