import { Parser } from 'htmlparser2';
import { Bus } from './Bus';
import { FileHolder } from './entities/FileHolder';
import { TH_DOCUMENT_LOADED, TH_NODE_SELECTED } from './Actions';
import { TH_AST_HIERARCHY_UPDATED } from './Editor';

export class Hierarchy {
    private element: HTMLElement;

    constructor(private bus: Bus) {
        this.element = document.getElementById('hierarchy-content')!;

        this.bus.on(TH_DOCUMENT_LOADED).subscribe((action) => {
            this.scaffoldFile(action.payload);
        });
        
        // Add subscription to AST hierarchy updates
        this.bus.on(TH_AST_HIERARCHY_UPDATED).subscribe((action) => {
            console.log('Hierarchy received TH_AST_HIERARCHY_UPDATED event with payload:', action.payload);
            this.renderASTHierarchy(action.payload);
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
        this.addNodeSelectionListeners();
    }

    private addNodeSelectionListeners(): void {
        const nodeNames = this.element.querySelectorAll('.node-name');
        nodeNames.forEach(nodeName => {
            nodeName.addEventListener('click', (event) => {
                // Remove selected class from all nodes
                this.element.querySelectorAll('.node-name.selected').forEach(node => {
                    node.classList.remove('selected');
                });
                
                // Add selected class to current node
                const target = event.currentTarget as HTMLElement;
                target.classList.add('selected');
                
                // Get the data-th attribute value
                const thid = target.getAttribute('data-th');
                
                // Find the corresponding element in the viewport
                const viewportElement = document.querySelector(`[data-th="${thid}"]`);
                
                if (viewportElement) {
                    // Emit node selected event
                    this.bus.push(TH_NODE_SELECTED, {
                        element: viewportElement,
                        thid: thid
                    });
                }
            });
        });
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

    private renderASTHierarchy(rootNode: any): void {
        console.log('Rendering AST hierarchy with root node:', rootNode);
        if (!rootNode || !rootNode.children) {
            console.error('Invalid AST hierarchy format');
            return;
        }
        
        let html = '<div class="node-list">';
        
        // Recursive function to render nodes
        const renderNode = (node: any, isRoot: boolean = false) => {
            // Skip the artificial root node, render its children directly
            if (isRoot) {
                console.log('Processing root node with', node.children.length, 'children');
                node.children.forEach((child: any) => {
                    renderNode(child);
                });
                return;
            }
            
            // Get node attributes
            const name = node.tagName || 'unknown';
            const id = node.attributes?.id || '';
            const classes = node.attributes?.class || '';
            const thId = node.id; // The unique ID generated for this node in the AST
            
            console.log('Rendering node:', { name, id, classes, thId });
            
            // Start node
            let nodeHtml = this.nodeOpenTemplate;
            nodeHtml = nodeHtml.replace('{{name}}', name);
            nodeHtml = nodeHtml.replace('{{thid}}', thId || '');
            
            // Add ID if present
            if (id) {
                nodeHtml = nodeHtml.replace('{{id}}', '&nbsp;' + this.parseId(id));
            } else {
                nodeHtml = nodeHtml.replace('{{id}}', '');
            }
            
            // Add classes if present
            if (classes) {
                nodeHtml = nodeHtml.replace('{{classes}}', '&nbsp;' + this.parseClasses(classes));
            } else {
                nodeHtml = nodeHtml.replace('{{classes}}', '');
            }
            
            html += nodeHtml;
            
            // Process children
            if (node.children && node.children.length > 0) {
                console.log('Node', name, 'has', node.children.length, 'children');
                node.children.forEach((child: any) => {
                    renderNode(child);
                });
            }
            
            // Close node
            html += this.nodeCloseTemplate;
        };
        
        // Start rendering from the root
        renderNode(rootNode, true);
        
        // Close the node list
        html += '</div>';
        
        // Update the DOM
        this.element.innerHTML = html;
        
        // Add click events to node names
        this.attachNodeEvents();
    }

    private attachNodeEvents(): void {
        const nodeNames = this.element.querySelectorAll('.node-name');
        nodeNames.forEach(nodeName => {
            nodeName.addEventListener('click', (event) => {
                // Remove selected class from all nodes
                this.element.querySelectorAll('.node-name.selected').forEach(node => {
                    node.classList.remove('selected');
                });
                
                // Add selected class to current node
                const target = event.currentTarget as HTMLElement;
                target.classList.add('selected');
                
                // Get the data-th attribute value
                const thid = target.getAttribute('data-th');
                
                // Find the corresponding element in the viewport
                const viewportElement = document.querySelector(`[data-th="${thid}"]`);
                
                if (viewportElement) {
                    // Emit node selected event
                    this.bus.push(TH_NODE_SELECTED, {
                        element: viewportElement,
                        thid: thid
                    });
                }
            });
        });
    }
}
