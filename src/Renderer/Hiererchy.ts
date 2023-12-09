import { Parser } from 'htmlparser2';
import { Bus } from './Bus';
import { FileHolder } from './entities/FileHolder';
import { TH_DOCUMENT_LOADED } from './Actions';

export class Hierarchy {
    private element: HTMLElement;

    constructor(private bus: Bus) {
        this.element = document.getElementById('hierarchy')!;

        this.bus.on(TH_DOCUMENT_LOADED).subscribe((action) => {
            this.scaffoldFile(action.payload);
        });
    }

    public scaffoldFile(file: FileHolder): void {
        let html = '<div class="node-list">';
        let depth = 0;
        const parser = new Parser({
            onopentag: (name, attribs) => {
                html += `<div class="node" data-th="${attribs['data-th']}">${name}`;
                let idText = this.parseId(attribs['id']);
                let classText = this.parseClasses(attribs['class']);
                if (attribs['id']) {
                    html += `&nbsp;<span class="id">${idText}</span>`;
                }
                if (attribs['class']) {
                    html += `&nbsp;<span class="classes">${classText}</span>`;
                }
            },
            ontext: (text) => {
                console.log(text);
            },
            onclosetag: (tagname) => {
                html += `</div>`;
            },
        });
        parser.write(file.asHTML());
        parser.end();

        this.element.innerHTML = html;
    }

    private parseId(idString: string): string {
        if (!idString) return '';

        return `#<span class="id">${idString}</span> `;
    }

    private parseClasses(classesString: string): string {
        if (!classesString) return '';

        let allClasses = classesString.split(' ');
        let displayedClasses = allClasses.slice(0, 2).map((c) => `.${c}`);
        let remainingClasses = allClasses.length - displayedClasses.length;

        let html = `<span class="classes">${displayedClasses.join(' ')}`;
        if (remainingClasses > 0) {
            html += `&nbsp;more(${remainingClasses})</span>`;
        } else {
            html += `</span>`;
        }

        return html;
    }
}
