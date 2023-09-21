import { wikis } from "./data/wikis.ts";

export const getWikiKeyForInput = (input: string) => {
    if (Object.keys(wikis).includes(input)) return input;

    let foundKey = '';
    Object.entries(wikis).forEach(entry => {
        if (entry[1].aliases.includes(input.replaceAll('+', ''))) foundKey = entry[0];
    });
    return foundKey;
}