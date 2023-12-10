import { FSObject } from '../lib/FSObject';
import { THProject } from '../lib/THProject';
import { TH_READ_FILE_REQUEST, TH_PROJECT_LOADED } from './Actions';
import { Action, Bus } from './Bus';
import { FSLink } from './FSLink';

export class FileBrowser {
    private rootDir: string;
    private files: FSObject[] = [];
    private element: HTMLElement;

    constructor(private bus: Bus, private fs: FSLink) {
        this.element = document.getElementById('file-browser-content')!;

        this.bus.on(TH_PROJECT_LOADED).subscribe((action: Action) => {
            this.rootDir = action.payload.rootDir;
            this.readDirectory('res://');
        });
    }

    private readDirectory(path: string): void {
        this.fs.readDir(path).then((files) => {
            this.files = files;
            this.redraw();
        });
    }

    private redraw(): void {
        let html = '<div class="node faded" data-path="res://">res://';

        this.files.forEach((f) => {
            console.log(f.path);
            html += `<div class="node" data-path="${f.path}">${f.name}</div>`;
        });

        html += '</div>';
        this.element.innerHTML = html;

        this.element.querySelectorAll('.node:not(.faded)').forEach((node) => {
            node.addEventListener('click', (e) => {
                console.log('click on: ', e.target);
                const element = e.target as HTMLElement;
                this.bus.push(TH_READ_FILE_REQUEST, element.dataset.path);
            });
        });
    }
}
