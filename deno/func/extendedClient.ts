import { Harmony } from '../deps.ts';

export class ExtendedClient extends Harmony.Client {
    owner?: string;
    prefix?: string;
}