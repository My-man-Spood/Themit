import { FSObject } from '../lib/FSObject';
import { TH_READ_FILE_REQUEST, TH_PROJECT_LOADED } from './Actions';
import { Action, Bus } from './Bus';
import { FSLink } from './FSLink';

export class FileBrowser {
    private files: FSObject[] = [];
    private element: HTMLElement;
    private expandedFolders: Set<string> = new Set();
    private icon_names: Record<string, string> = {
        'html': 'file_type_html.svg',
        'css': 'file_type_css.svg',
        'js': 'file_type_js.svg',
        'ts': 'file_type_typescript.svg',
        'json': 'file_type_json.svg',
        'txt': 'file_type_txt.svg',
        'md': 'file_type_md.svg',
        '': 'default_file.svg'
    };

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

    private toggleFolder(path: string): void {
        if (this.expandedFolders.has(path)) {
            this.expandedFolders.delete(path);
        } else {
            this.expandedFolders.add(path);
            // Load folder contents if not already loaded
            this.fs.readDir(path).then((files) => {
                // Find the folder in our file structure and update its children
                this.updateFolderChildren(path, files.map(f => new FSObject(f.name, f.path, f.isDirectory, f.children)));
                this.redraw();
            });
        }
        this.redraw();
    }

    private updateFolderChildren(folderPath: string, children: FSObject[]): void {
        // Helper function to recursively find and update a folder's children
        const findAndUpdateFolder = (files: FSObject[]): boolean => {
            for (const file of files) {
                if (file.path === folderPath) {
                    file.children = children;
                    return true;
                }
                if (file.isDirectory && file.children && file.children.length > 0) {
                    if (findAndUpdateFolder(file.children)) {
                        return true;
                    }
                }
            }
            return false;
        };

        findAndUpdateFolder(this.files);
    }

    private redraw(): void {
        let html = '<div class="node faded" data-path="src://">src://';

        // Recursive function to generate HTML for file tree
        const generateNodeHtml = (files: FSObject[], level: number = 1): string => {
            let nodeHtml = '';
            const indent = level * 20; // Indentation based on nesting level
            
            files.forEach((f: FSObject) => {
                let icon = f.isDirectory ? 'default_folder.svg' : f.ext ? this.icon_names[f.ext] : 'default_file.svg';
                let isExpanded = f.isDirectory && this.expandedFolders.has(f.path);
                let folderClass = f.isDirectory ? 'folder' : 'file';
                let expandedClass = isExpanded ? 'expanded' : '';
                
                nodeHtml += `<div class="node ${folderClass} ${expandedClass}" data-path="${f.path}" data-is-directory="${f.isDirectory}" style="padding-left: ${indent}px">
                    <img src="assets/icons/${icon}"/>${f.name}</div>`;
                
                // If folder is expanded and has children, render them
                if (isExpanded && f.children && f.children.length > 0) {
                    nodeHtml += generateNodeHtml(f.children, level + 1);
                }
            });
            
            return nodeHtml;
        };

        html += generateNodeHtml(this.files);
        html += '</div>';
        this.element.innerHTML = html;

        this.element.querySelectorAll('.node:not(.faded)').forEach((node) => {
            node.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                const element = e.currentTarget as HTMLElement;
                const path = element.dataset.path || '';
                const isDirectory = element.dataset.isDirectory === 'true';
                
                if (isDirectory) {
                    this.toggleFolder(path);
                } else {
                    this.bus.push(TH_READ_FILE_REQUEST, path);
                }
            });
        });
    }
}
