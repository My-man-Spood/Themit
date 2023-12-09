import * as Cheerio from 'cheerio';
import { Hierarchy } from './Hiererchy';
import { FileHolder } from './entities/FileHolder';
import { Bus } from './Bus';
import { TH_DOCUMENT_LOADED } from './Actions';

export class Editor {
    private file: FileHolder;
    private hierarchy: Hierarchy;
    private bus: Bus;

    constructor() {
        this.bus = new Bus();
        this.hierarchy = new Hierarchy(this.bus);
    }

    public openFile(): void {
        var swag = window['electron'].loadDocument('project.html').then((val) => {
            this.file = new FileHolder(val);
            this.bus.push(TH_DOCUMENT_LOADED, this.file);

            document.getElementById('viewport').innerHTML = this.file.asHTML();
        });
    }
}
