import { Parser } from 'htmlparser2';
import { Bus } from './Bus';
import { FileHolder } from './entities/FileHolder';
import { TH_DOCUMENT_LOADED } from './Actions';

export class Hierarchy {
    private element: HTMLElement;

    constructor(private bus: Bus) {
        this.element = document.getElementById('hierarchy-content')!;

        this.bus.on(TH_DOCUMENT_LOADED).subscribe((action) => {
            this.scaffoldFile(action.payload);
        });
    }

    private nodeOpenTemplate = `
    <div class="node"> 
        <p class="node-name" data-th="{{thid}}">{{name}}{{id}}{{classes}}</p>
        <ul class="node-children">
    `;

    private nodeCloseTemplate = `
    </ul>
    </div>
    `;

    public scaffoldFile(file: FileHolder): void {
        let html = '<div class="node-list">';
        let depth = 0;
        let currentDepth = 0;

        const parser = new Parser({
            onopentag: (name, attribs) => {
                currentDepth++;
                let temp = '';
                if (depth === currentDepth) html += this.nodeCloseTemplate;

                temp += this.nodeOpenTemplate;
                temp = temp.replace('{{name}}', name);
                temp = temp.replace('{{thid}}', attribs['data-th']);

                let idText = this.parseId(attribs['id']);
                let classText = this.parseClasses(attribs['class']);
                if (attribs['id']) {
                    temp = temp.replace('{{id}}', '&nbsp;' + idText);
                } else {
                    temp = temp.replace('{{id}}', '');
                }
                if (attribs['class']) {
                    temp = temp.replace('{{classes}}', '&nbsp;' + classText);
                } else {
                    temp = temp.replace('{{classes}}', '');
                }

                html += temp;
                console.log('open tag: ', temp);
                depth = currentDepth;
            },
            ontext: (text) => {},
            onclosetag: (tagname) => {
                if (depth === 0) {
                    html += `</div>`;
                }

                currentDepth--;
            },
        });
        parser.write(file.asHTML());
        parser.end();

        this.element.innerHTML = html;
    }

    private parseId(idString: string): string {
        if (!idString) return '';

        return `<span class="id">#${idString}</span> `;
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
