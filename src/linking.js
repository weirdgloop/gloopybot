'use strict';

const { getDefaultWiki } = require('./database');
const { getWikiKeyForInput, wikis } = require('./data/wikis');

const LINK_TYPES = {
  normal: 'search',
  search: 'search',
  template: 'template',
  raw: 'raw',
  hardlink: 'raw'
};
const MAX_MESSAGE_LOOKUPS = 10;
const LOOKUP_ERROR_MESSAGE = 'The wiki lookup failed. Please try again in a moment.';

/** Remove Discord mentions, code, URLs, and control characters before parsing link markup. */
function cleanMessageContent(content) {
  return String(content ?? '')
    .replace(/<!?@!?[0-9]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/<?https?:\/\/[^\s<>]*>?/g, ' ')
    .replace(/[\p{Cc}\p{Cf}]/gu, '');
}

/** Extract and de-duplicate normal, template, and raw queries in their original message order. */
function extractWikiQueries(content) {
  const cleaned = cleanMessageContent(content);
  const queries = [];
  const patterns = [
    { regex: /\[\[(.*?)(?:\|.*?)?\]\]/g, type: 'search' },
    { regex: /{{(.*?)(?:\|.*?)?}}/g, type: 'template' },
    { regex: /--(.*?)(?:\|.*?)?--/g, type: 'raw' }
  ];

  for (const { regex, type } of patterns) {
    for (const match of cleaned.matchAll(regex)) {
      const query = match[1]?.trim();
      if (query) queries.push({ query, type, position: match.index });
    }
  }

  queries.sort((left, right) => left.position - right.position);
  const seen = new Set();
  return queries.filter(({ query, type }) => {
    const key = JSON.stringify([query, type]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(({ query, type }) => ({ query, type }));
}

/** Resolve a recognized `wiki:` prefix for message links, otherwise use the configured default. */
function parseWikiQuery(query, defaultWikiKey) {
  const colonIndex = query.indexOf(':');
  if (colonIndex <= 0) return { wikiKey: defaultWikiKey, query };

  const explicitWikiKey = getWikiKeyForInput(query.slice(0, colonIndex));
  if (!explicitWikiKey) return { wikiKey: defaultWikiKey, query };

  return {
    wikiKey: explicitWikiKey,
    query: query.slice(colonIndex + 1).trim()
  };
}

/** Encode a MediaWiki page title while preserving URL path separators and wiki title syntax. */
function wikiUrlEncode(value) {
  return encodeURIComponent(value)
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
    .replace(/%40/g, '%40');
}

/** Escape or normalize URL characters that Discord otherwise parses incorrectly. */
function fixDiscordLink(url) {
  return url
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/%23/g, '#')
    .replace(/ /g, '_');
}

/** Build a direct article URL without querying the wiki API. */
function buildRawLink(query, wiki) {
  const articlePath = wiki.articleSubdomain ?? '/w';
  return `${wiki.url}${articlePath}/${fixDiscordLink(wikiUrlEncode(query))}`;
}

/** Ask the wiki OpenSearch API for the first matching page URL. */
async function findPage(query, wiki, type) {
  const search = type === 'template' ? `Template:${query}` : query;
  const apiUrl = `${wiki.url}${wiki.apiSubdomain ?? ''}/api.php?action=opensearch&search=${wikiUrlEncode(search)}&redirects=resolve`;
  const response = await fetch(apiUrl, {
    headers: { 'User-Agent': 'GloopyBot 2.0' },
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`Wiki search returned HTTP ${response.status}`);
  }
  const data = await response.json();
  return data[3]?.[0] ? fixDiscordLink(data[3][0]) : undefined;
}

/** Return the same setup guidance for lookups that lack an applicable default wiki. */
function notConfiguredResult(context) {
  if (!context.guildId) {
    return {
      status: 'not-configured',
      content: 'No wiki is set for this DM yet. Use `/setwiki` with `where: Channel` to choose a default wiki for this conversation.'
    };
  }

  return {
    status: 'not-configured',
    content: 'GloopyBot has no default wiki set for this server. Ask an administrator to configure one with `/setwiki`, or set your own with `where: User`.'
  };
}

/** Format lookup URLs for Discord and enforce the response-size limit. */
function makeLinksMessage(urls, migrationWarning = '', lookupLimitNotice = '') {
  const content = `**Wiki links found:**\n${urls.map((url) => `<${url}>`).join('\n')}${migrationWarning}${lookupLimitNotice}`;
  if (content.length > 1900) {
    return { status: 'too-long', content: 'I found wiki links, but the result is too long to send. Try fewer links.' };
  }
  return { status: 'links', content };
}

/** Resolve a batch using the user's, channel's, or server's configured wiki defaults. */
async function lookupQueries(queries, context) {
  const defaultWikiKey = getDefaultWiki(context);
  if (!defaultWikiKey) return notConfiguredResult(context);

  const apiQueries = queries.filter(({ type }) => type !== 'raw');
  const rawQueries = queries.filter(({ type }) => type === 'raw');
  const urls = [];

  for (const { query, type } of apiQueries) {
    const parsed = parseWikiQuery(query, defaultWikiKey);
    const wiki = wikis[parsed.wikiKey];
    if (!wiki) continue;
    const url = await findPage(parsed.query, wiki, type);
    if (url) urls.push(url);
  }

  for (const { query } of rawQueries) {
    const parsed = parseWikiQuery(query, defaultWikiKey);
    const wiki = wikis[parsed.wikiKey];
    if (wiki) urls.push(buildRawLink(parsed.query, wiki));
  }

  if (urls.length === 0) return { status: 'no-results' };
  return makeLinksMessage(urls, context.migrationWarning, context.lookupLimitNotice);
}

/** Look up at most ten distinct wiki links from a message and report when later links were skipped. */
async function lookupMessageContent(content, context) {
  const allQueries = extractWikiQueries(content);
  if (allQueries.length === 0) return { status: 'no-links' };

  const wasLimited = allQueries.length > MAX_MESSAGE_LOOKUPS;
  const queries = allQueries.slice(0, MAX_MESSAGE_LOOKUPS);
  const lookupContext = wasLimited
    ? { ...context, lookupLimitNotice: '\n\n> Only the first 10 wiki links in this message were checked.' }
    : context;

  try {
    const result = await lookupQueries(queries, lookupContext);
    return wasLimited && result.status === 'no-results'
      ? {
        ...result,
        limited: true,
        content: 'No wiki pages were found among the first 10 links in that message. Any remaining links were left unchecked.'
      }
      : result;
  } catch (error) {
    console.error('Wiki link lookup failed:', error);
    return { status: 'error', content: LOOKUP_ERROR_MESSAGE };
  }
}

/** Handle `/wiki`; an explicit wiki option fixes the target even if the query has a prefix. */
async function lookupWikiCommand(query, requestedType, context, requestedWikiKey) {
  const normalizedQuery = String(query ?? '').trim();
  if (!normalizedQuery) return { status: 'no-query' };

  const type = LINK_TYPES[requestedType] ?? 'search';
  const defaultWikiKey = requestedWikiKey || getDefaultWiki(context);
  if (!defaultWikiKey) return notConfiguredResult(context);

  try {
    const parsedQuery = parseWikiQuery(normalizedQuery, defaultWikiKey).query;
    const wiki = wikis[defaultWikiKey];
    if (!wiki) return { status: 'no-results' };

    const url = type === 'raw'
      ? buildRawLink(parsedQuery, wiki)
      : await findPage(parsedQuery, wiki, type);
    if (!url) return { status: 'no-results', query: normalizedQuery, wikiName: wiki.name };
    return makeLinksMessage([url]);
  } catch (error) {
    console.error('Wiki command lookup failed:', error);
    return { status: 'error', content: LOOKUP_ERROR_MESSAGE };
  }
}

module.exports = { lookupMessageContent, lookupWikiCommand };
