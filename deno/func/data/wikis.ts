interface WikiDefinition {
    url: string,
    name: string,
    aliases: string[],
    apiSubdomain?: string,
    articleSubdomain?: string
}

export const wikis : Record<string, WikiDefinition> = {
    r: {
        url: "https://runescape.wiki",
        name: "RuneScape",
        aliases: ["rs3", "rsw", "+rs", "+runescape"]
    },
    o: {
        url: "https://oldschool.runescape.wiki",
        name: "Old School RuneScape",
        aliases: ["osrs", "osw", "osrsw", "os", "+oldschool", "2007", "2007scape", "oldschoolrunescape"]
    },
    p: {
        url: "https://pt.runescape.wiki",
        name: "RuneScape Português",
        aliases: ["pt", "br", "ptbr", "ptrsw"]
    },
    c: {
        url: "https://classic.runescape.wiki",
        name: "RuneScape Classic",
        aliases: ["rscw", "classic", "rsc"]
    },
    d: {
        url: "https://dragonwilds.runescape.wiki",
        name: "RuneScape: Dragonwilds",
        aliases: ["dw", "rsdw"]
    },
    m: {
        url: "https://meta.runescape.wiki",
        name: "RuneScape Wiki Meta",
        aliases: ["meta", "metars", "rsmeta"]
    },
    g: {
        url: "https://meta.weirdgloop.org",
        name: "Weird Gloop Meta",
        aliases: ["metawg", "gloop", "weirdgloop"]
    },
    b: {
        url: "https://brightershoreswiki.org",
        name: "Brighter Shores",
        aliases: ["+bs", "shores"]
    },
    mc: {
        url: "https://minecraft.wiki",
        name: "Minecraft Wiki",
        aliases: ["+mcw", "minecraft"]
    },
    l: {
        url: "https://wiki.leagueoflegends.com/en-us",
        name: "League of Legends Wiki (en-US)",
        aliases: ["lol", "league"]
    },
    w: {
        url: "https://en.wikipedia.org",
        name: "Wikipedia (English)",
        aliases: ["wp", "wikipedia", "enwp"],
        apiSubdomain: '/w',
        articleSubdomain: '/wiki'
    }
    
};
