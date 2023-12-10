import * as Cheerio from 'cheerio';
import { Hierarchy } from './Hiererchy';
import { FileHolder } from './entities/FileHolder';
import { Bus } from './Bus';
import { TH_DOCUMENT_LOADED, TH_PROJECT_LOADED, TH_READ_FILE_REQUEST } from './Actions';
import { FileBrowser } from './FileBrowser';
import { THProject } from '../lib/THProject';

export class Editor {
    private file: FileHolder;
    private hierarchy: Hierarchy;
    private fileBrowser: FileBrowser;
    private thProject: THProject;
    private bus: Bus;

    constructor() {
        this.bus = new Bus();
        this.hierarchy = new Hierarchy(this.bus);
        this.fileBrowser = new FileBrowser(this.bus, {
            readDir: (path: string) => window['electron'].readDirectory(path),
        });

        Promise.all([window['electron'].loadProject()]).then((values) => {
            this.thProject = values[0];
            this.bus.push(TH_PROJECT_LOADED, this.thProject);
        });

        this.bus.on(TH_READ_FILE_REQUEST).subscribe((action) => {
            this.openFile(action.payload);
        });
    }

    public openFile(filepath: string): void {
        console.log('Opening file: ' + filepath);
        window['electron'].loadDocument(filepath).then((val) => {
            this.file = new FileHolder(val);
            this.bus.push(TH_DOCUMENT_LOADED, this.file);

            document.getElementById('viewport').innerHTML = this.file.asHTML();
        });
    }
}
