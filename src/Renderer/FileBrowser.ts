import { FSObject } from '../lib/FSObject';
import { TH_READ_FILE_REQUEST, TH_PROJECT_LOADED } from './Actions';
import { Action, Bus } from './Bus';
import { FSLink } from './FSLink';

export class FileBrowser {
    private files: FSObject[] = [];
    private element: HTMLElement;

    constructor(private bus: Bus, private fs: FSLink) {
        this.element = document.getElementById('file-browser-content')!;

        this.bus.on(TH_PROJECT_LOADED).subscribe((action: Action) => {
            this.readDirectory('src://');
        });
    }

    private readDirectory(path: string): void {
        this.fs.readDir(path).then((files) => {
            this.files = files.map((f) => new FSObject(f.name, f.path, f.isDirectory, f.children));
            this.redraw();
        });
    }

    private redraw(): void {
        let html = '<div class="node faded" data-path="src://">src://';

        this.files.forEach((f: FSObject) => {
            let icon = f.isDirectory ? 'default_folder.svg' : f.ext ? `file_type_${f.ext}.svg` : 'default_file.svg';

            html += `<div class="node" data-path="${f.path}"><img src="assets/icons/${icon}"/>${f.name}</div>`;
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
