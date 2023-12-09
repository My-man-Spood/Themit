import * as Cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

export class FileHolder {
    private parsedFile: Cheerio.CheerioAPI;

    constructor(private rawFile: string) {
        this.parsedFile = Cheerio.load(rawFile, null, false);
        this.addTokens();
    }

    public asHTML(): string {
        return this.parsedFile.html();
    }

    private addTokens() {
        this.parsedFile('*').each((i, elem) => {
            this.parsedFile(elem).prop('data-th', uuidv4());
        });
    }
}
