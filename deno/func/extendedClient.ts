import { Harmony } from '../deps.ts';

export class ExtendedClient extends Harmony.Client {
    owner: string;
    prefix: string;

    constructor(owner: string, prefix: string, options?: Harmony.ClientOptions) {
        if (prefix === '') {
            throw 'ExtendedClient must be initialised with a non-empty prefix!';
        }
        
        super(options);
        this.owner = owner;
        this.prefix = prefix;
    }
}