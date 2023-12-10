import { FSObject } from '../lib/FSObject';

export interface FSLink {
    readDir: (path: string) => Promise<FSObject[]>;
}
