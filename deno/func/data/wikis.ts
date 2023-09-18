interface WikiDefinition {
    url: string,
    name: string,
    aliases: string[]
}

export const wikis : {[key: string]: WikiDefinition} = {
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
    m: {
        url: "https://meta.weirdgloop.org",
        name: "Weird Gloop Meta",
        aliases: ["meta", "g", "gloop", "weirdgloop"]
    },
    w: {
        url: "https://en.wikipedia.org",
        name: "Wikipedia (English)",
        aliases: ["wp", "wikipedia", "enwp"]
    }
};