'use strict';

const wikis = {
  r: {
    url: 'https://runescape.wiki',
    name: 'RuneScape',
    aliases: ['rs3', 'rsw']
  },
  o: {
    url: 'https://oldschool.runescape.wiki',
    name: 'Old School RuneScape',
    aliases: ['osrs', 'osw', 'osrsw', 'os', '2007', '2007scape', 'oldschoolrunescape']
  },
  p: {
    url: 'https://pt.runescape.wiki',
    name: 'RuneScape Português',
    aliases: ['pt', 'br', 'ptbr', 'ptrsw']
  },
  c: {
    url: 'https://classic.runescape.wiki',
    name: 'RuneScape Classic',
    aliases: ['rscw', 'classic', 'rsc']
  },
  d: {
    url: 'https://dragonwilds.runescape.wiki',
    name: 'RuneScape: Dragonwilds',
    aliases: ['dw', 'rsdw']
  },
  m: {
    url: 'https://meta.runescape.wiki',
    name: 'RuneScape Wiki Meta',
    aliases: ['meta', 'metars', 'rsmeta']
  },
  g: {
    url: 'https://meta.weirdgloop.org',
    name: 'Weird Gloop Meta',
    aliases: ['metawg', 'gloop', 'weirdgloop']
  },
  b: {
    url: 'https://brightershoreswiki.org',
    name: 'Brighter Shores',
    aliases: ['shores']
  },
  mc: {
    url: 'https://minecraft.wiki',
    name: 'Minecraft Wiki',
    aliases: ['minecraft']
  },
  l: {
    url: 'https://wiki.leagueoflegends.com/en-us',
    name: 'League of Legends Wiki (en-US)',
    aliases: ['lol', 'league']
  },
  w: {
    url: 'https://en.wikipedia.org',
    name: 'Wikipedia (English)',
    aliases: ['wp', 'wikipedia', 'enwp'],
    apiSubdomain: '/w',
    articleSubdomain: '/wiki'
  }
};

/** Resolve a wiki's canonical key or any of its aliases; return an empty string if unknown. */
function getWikiKeyForInput(input) {
  const normalizedInput = String(input ?? '').toLowerCase();
  if (Object.hasOwn(wikis, normalizedInput)) return normalizedInput;

  for (const [key, wiki] of Object.entries(wikis)) {
    if (wiki.aliases.includes(normalizedInput)) return key;
  }
  return '';
}

module.exports = { wikis, getWikiKeyForInput };
