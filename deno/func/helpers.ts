import { wikis } from "./data/wikis.ts";

export const getWikiKeyForInput = (input: string, stripPlus: boolean) => {
    if (Object.keys(wikis).includes(input)) return input;

    let foundKey = '';
    Object.entries(wikis).forEach(entry => {
        if (entry[1].aliases.map(x => { if (stripPlus) {return x.replaceAll('+','')} else return x }).includes(input)) foundKey = entry[0];
    });
    return foundKey;
}