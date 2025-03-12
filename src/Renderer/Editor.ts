import { Hierarchy } from './Hierarchy';
import { Bus } from './Bus';
import { TH_PROJECT_LOADED, TH_READ_FILE_REQUEST } from './Actions';
import { FileBrowser } from './FileBrowser';
import { THProject } from '../lib/THProject';
import { Inspector } from './Inspector';

// Define action types for AST and preview
export const TH_PROJECT_PREVIEW_LOADED = 'TH_PROJECT_PREVIEW_LOADED';
export const TH_PROJECT_PREVIEW_ERROR = 'TH_PROJECT_PREVIEW_ERROR';
export const TH_AST_LOADED = 'TH_AST_LOADED';
export const TH_AST_HIERARCHY_UPDATED = 'TH_AST_HIERARCHY_UPDATED';

export class Editor {
    private currentHTMLAstId: string | null = null;
    private currentCSSAstId: string | null = null;
    private currentHTMLFilePath: string | null = null;
    private currentCSSFilePath: string | null = null;
    private previewIframe: HTMLIFrameElement | null = null;
    private isDevServerRunning: boolean = false;
    private devServerUrl: string = '';
    
    private bus: Bus;
    private fileBrowser: FileBrowser;
    private hierarchy: Hierarchy;
    private inspector: Inspector;
    
    constructor() {
        this.bus = new Bus();
        this.hierarchy = new Hierarchy(this.bus);
        this.inspector = new Inspector(this.bus);
        this.fileBrowser = new FileBrowser(this.bus, {
            readDir: (path: string) => window['electron'].readDirectory(path),
        });
        
        // Initialize event subscriptions
        this.setupEventListeners();
        
        // Load project and start server
        Promise.all([window['electron'].loadProject(), this.startDevServer()]).then((values) => {
            const currentProject = values[0];
            this.bus.push(TH_PROJECT_LOADED, currentProject);
            
            // Check if dev server is already running
            this.checkDevServerStatus();
            
            // Add build and preview button functionality
            this.setupBuildButton();
        });
        
        // Check dev server status
        this.checkDevServerStatus();
    }
    
    private setupEventListeners(): void {
        // Listen for file read requests
        this.bus.on(TH_READ_FILE_REQUEST).subscribe(action => {
            this.openFile(action.payload);
        });
        
        // Listen for project loaded events
        this.bus.on(TH_PROJECT_LOADED).subscribe(action => {
            const currentProject = action.payload;
            console.log('Project loaded:', currentProject);
        });
    }
    
    /**
     * Open a file
     */
    public openFile(filepath: string): void {
        console.log('Opening file:', filepath);
        const fileExtension = this.getFileExtension(filepath).toLowerCase();
        
        if (fileExtension === '.html' || fileExtension === '.htm') {
            this.openHTMLFile(filepath);
        } else if (fileExtension === '.css') {
            this.openCSSFile(filepath);
        } else {
            console.log('Unsupported file type:', fileExtension);
            // Show message in viewport
            const viewportElement = document.getElementById('viewport');
            if (viewportElement) {
                viewportElement.innerHTML = `<div class="unsupported-file">
                    <h2>Unsupported File Type</h2>
                    <p>The file type "${fileExtension}" is not currently supported by the editor.</p>
                </div>`;
            }
        }
    }
    
    /**
     * Open an HTML file using the AST parser
     */
    private openHTMLFile(filepath: string): void {
        console.log('Opening HTML file with AST:', filepath);
        
        // Reset current AST IDs
        this.currentHTMLAstId = null;
        
        // Use the AST parser to parse the HTML file
        window['electron'].ast.parseHTMLFile(filepath)
            .then((astId: string) => {
                console.log('HTML file parsed, AST ID:', astId);
                this.currentHTMLAstId = astId;
                this.currentHTMLFilePath = filepath;
                
                // Update the hierarchy based on the AST
                this.updateHierarchyFromAST(astId);
                
                // Update the viewport with the HTML content
                this.refreshHTMLView(filepath);
            })
            .catch((error) => {
                console.error('Error parsing HTML file:', error);
                // Show error in viewport
                const viewportElement = document.getElementById('viewport');
                if (viewportElement) {
                    viewportElement.innerHTML = `<div class="error-message">
                        <h2>Error Opening HTML File</h2>
                        <p>${error.message || 'An unknown error occurred'}</p>
                    </div>`;
                }
            });
    }
    
    /**
     * Open a CSS file using the AST parser
     */
    private openCSSFile(filepath: string): void {
        // Reset current AST ID
        this.currentCSSAstId = null;
        
        // Parse the CSS file with the AST parser
        window['electron'].ast.parseCSSFile(filepath)
            .then((astId: string) => {
                console.log('CSS AST created with ID:', astId);
                this.currentCSSAstId = astId;
                this.currentCSSFilePath = filepath;
                
                // Notify about AST loaded
                this.bus.push(TH_AST_LOADED, { 
                    type: 'css', 
                    astId, 
                    filePath: filepath 
                });
                
                // Display CSS content for editing
                this.refreshCSSView(filepath);
            })
            .catch((error) => {
                console.error('Error parsing CSS file:', error);
                const viewportElement = document.getElementById('viewport');
                if (viewportElement) {
                    viewportElement.innerHTML = `<div class="error">Error parsing CSS file: ${error.message}</div>`;
                }
            });
    }
    
    /**
     * Load HTML content for direct viewing (when not in preview mode)
     */
    private refreshHTMLView(filepath: string): void {
        window['electron'].loadDocument(filepath)
            .then((content: string) => {
                if (!this.isDevServerRunning) {
                    const viewportElement = document.getElementById('viewport');
                    if (viewportElement && content) {
                        viewportElement.innerHTML = content;
                    }
                }
            })
            .catch((error) => {
                console.error('Error loading HTML content:', error);
            });
    }
    
    /**
     * Load CSS content for viewing
     */
    private refreshCSSView(filepath: string): void {
        window['electron'].loadDocument(filepath)
            .then((content: string) => {
                const viewportElement = document.getElementById('viewport');
                if (viewportElement && content) {
                    // Create a code viewer for CSS
                    viewportElement.innerHTML = `<pre class="css-view"><code>${content}</code></pre>`;
                }
            })
            .catch((error) => {
                console.error('Error loading CSS content:', error);
            });
    }
    
    /**
     * Update the hierarchy view using the AST
     */
    private updateHierarchyFromAST(astId: string): void {
        console.log('Requesting hierarchy data for AST ID:', astId);
        window['electron'].ast.getHTMLHierarchy(astId)
            .then((hierarchy: any[]) => {
                console.log('Received AST Hierarchy data:', hierarchy);
                
                // Create a hierarchy that can be consumed by the Hierarchy component
                const adaptedHierarchy = this.adaptASTHierarchyToCurrentFormat(hierarchy);
                console.log('Adapted hierarchy for rendering:', adaptedHierarchy);
                
                // Push the hierarchy to the bus so the Hierarchy component can update
                console.log('Dispatching TH_AST_HIERARCHY_UPDATED event');
                this.bus.push(TH_AST_HIERARCHY_UPDATED, adaptedHierarchy);
            })
            .catch((error) => {
                console.error('Error getting HTML hierarchy from AST:', error);
            });
    }
    
    /**
     * Adapt the AST hierarchy format to the format expected by the Hierarchy component
     */
    private adaptASTHierarchyToCurrentFormat(astHierarchy: any[]): any {
        // Create a root node and build a tree structure
        const root = { 
            id: 'root',
            children: [],
            type: 'element'
        };
        
        // Map to store nodes by their ID for quick lookup
        const nodesById = new Map();
        nodesById.set('root', root);
        
        // First pass: create all nodes
        astHierarchy.forEach((item) => {
            const node = {
                id: item.id,
                tagName: item.tagName,
                attributes: item.attributes || {},
                children: [],
                parentId: item.parentId || 'root',
                type: 'element',
                sourceLocation: item.sourceLocation
            };
            
            nodesById.set(item.id, node);
        });
        
        // Second pass: build the tree
        astHierarchy.forEach((item) => {
            const node = nodesById.get(item.id);
            const parent = nodesById.get(item.parentId || 'root');
            
            if (parent && node) {
                parent.children.push(node);
            }
        });
        
        return root;
    }
    
    /**
     * Update an HTML element's attribute using the AST
     */
    public updateHTMLAttribute(nodeId: string, attrName: string, attrValue: string): Promise<boolean> {
        if (!this.currentHTMLAstId) {
            return Promise.reject(new Error('No HTML AST loaded'));
        }
        
        return window['electron'].ast.updateHTMLAttribute(
            this.currentHTMLAstId, 
            nodeId, 
            attrName, 
            attrValue
        ).then((success: boolean) => {
            if (success) {
                // Save the changes to the source file
                return this.saveHTMLChanges();
            }
            return false;
        });
    }
    
    /**
     * Update a CSS property using the AST
     */
    public updateCSSProperty(selector: string, property: string, value: string): Promise<boolean> {
        if (!this.currentCSSAstId) {
            return Promise.reject(new Error('No CSS AST loaded'));
        }
        
        return window['electron'].ast.updateCSSProperty(
            this.currentCSSAstId,
            selector,
            property,
            value
        ).then((success: boolean) => {
            if (success) {
                // Save the changes to the source file
                return this.saveCSSChanges();
            }
            return false;
        });
    }
    
    /**
     * Save HTML changes back to the source file
     */
    private saveHTMLChanges(): Promise<boolean> {
        if (!this.currentHTMLAstId) {
            return Promise.reject(new Error('No HTML AST loaded'));
        }
        
        return window['electron'].ast.saveHTMLFile(this.currentHTMLAstId)
            .then((success: boolean) => {
                if (success) {
                    if (this.isDevServerRunning && this.previewIframe) {
                        // Refresh the preview to see changes
                        this.refreshPreview();
                    } else if (this.currentHTMLFilePath) {
                        // Refresh the direct view if not in preview mode
                        this.refreshHTMLView(this.currentHTMLFilePath);
                    }
                }
                return success;
            });
    }
    
    /**
     * Save CSS changes back to the source file
     */
    private saveCSSChanges(): Promise<boolean> {
        if (!this.currentCSSAstId) {
            return Promise.reject(new Error('No CSS AST loaded'));
        }
        
        return window['electron'].ast.saveCSSFile(this.currentCSSAstId)
            .then((success: boolean) => {
                if (success) {
                    if (this.isDevServerRunning && this.previewIframe) {
                        // Refresh the preview to see changes
                        this.refreshPreview();
                    } else if (this.currentCSSFilePath) {
                        // Refresh the view
                        this.refreshCSSView(this.currentCSSFilePath);
                    }
                }
                return success;
            });
    }
    
    /**
     * Refresh the preview iframe
     */
    private refreshPreview(): void {
        if (this.previewIframe) {
            // Simply reload the iframe
            this.previewIframe.src = this.previewIframe.src;
        }
    }
    
    /**
     * Start the development server and show preview
     */
    public startDevServer(): Promise<void> {
        const viewportElement = document.getElementById('viewport')!;
        viewportElement.innerHTML = '<div class="loading">Starting development server...</div>';
        
        return window['electron'].startDevServer()
            .then((url: string) => {
                this.devServerUrl = url;
                this.isDevServerRunning = true;
                this.loadPreviewInIframe(url);
                this.bus.push(TH_PROJECT_PREVIEW_LOADED, { url });
                return Promise.resolve();
            })
            .catch((error: Error) => {
                viewportElement.innerHTML = `<div class="error">Failed to start dev server: ${error.message}</div>`;
                this.bus.push(TH_PROJECT_PREVIEW_ERROR, { error: error.message });
                return Promise.reject(error);
            });
    }
    
    /**
     * Stop the development server
     */
    public stopDevServer(): Promise<void> {
        return window['electron'].stopDevServer()
            .then(() => {
                this.isDevServerRunning = false;
                this.devServerUrl = '';
                this.previewIframe = null;
                
                // Clear the viewport
                const viewportElement = document.getElementById('viewport')!;
                viewportElement.innerHTML = '';
                
                // Refresh the current view if a file is open
                if (this.currentHTMLFilePath) {
                    this.refreshHTMLView(this.currentHTMLFilePath);
                } else if (this.currentCSSFilePath) {
                    this.refreshCSSView(this.currentCSSFilePath);
                }
                
                return Promise.resolve();
            });
    }
    
    /**
     * Check the status of the dev server
     */
    private checkDevServerStatus(): void {
        window['electron'].getDevServerStatus()
            .then((status: { running: boolean, url: string }) => {
                this.isDevServerRunning = status.running;
                this.devServerUrl = status.url;
                
                if (status.running && status.url) {
                    this.loadPreviewInIframe(status.url);
                }
            });
    }
    
    /**
     * Load the project preview in an iframe
     */
    private loadPreviewInIframe(url: string): void {
        const viewportElement = document.getElementById('viewport')!;
        viewportElement.innerHTML = '';
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.id = 'project-preview';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        // Add to viewport
        viewportElement.appendChild(iframe);
        this.previewIframe = iframe;
        
        // For security reasons, we can't directly interact with iframe content
        // when it's served from a different origin (localhost:3000 vs file://)
        // Instead, we'll add a message to inform the user
        const messageOverlay = document.createElement('div');
        messageOverlay.className = 'preview-message';
        messageOverlay.innerHTML = `
            <div class="preview-controls">
                <button id="refresh-preview">Refresh Preview</button>
                <span>Preview Mode: Changes will be reflected automatically</span>
            </div>
        `;
        viewportElement.appendChild(messageOverlay);
        
        // Add refresh button functionality
        const refreshButton = document.getElementById('refresh-preview');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshPreview();
            });
        }
        
        // Add some basic styles for the message overlay
        const style = document.createElement('style');
        style.textContent = `
            .preview-message {
                position: relative;
                top: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 8px;
                font-size: 12px;
                z-index: 1000;
            }
            .preview-controls {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .preview-controls button {
                background: #4a90e2;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
            }
            .preview-controls button:hover {
                background: #3a80d2;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Set up interaction with elements in the iframe
     * Note: This method is kept for future use but currently disabled due to cross-origin restrictions
     */
    private setupIframeInteraction(iframe: HTMLIFrameElement): void {
        try {
            // Due to security restrictions, we can't access iframe content
            // when it's served from a different origin (localhost:3000 vs file://)
            console.log('iframe loaded, but direct interaction is limited due to cross-origin restrictions');
            
            // We'll keep this method for future use if we implement a solution
            // such as injecting scripts into the page via the dev server
        } catch (error) {
            console.error('Error setting up iframe interaction:', error);
        }
    }
    
    /**
     * Highlight an element in the iframe
     */
    private highlightElement(element: HTMLElement): void {
        try {
            // Remove highlight from all elements
            const iframeDocument = this.previewIframe?.contentDocument || this.previewIframe?.contentWindow?.document;
            if (!iframeDocument) return;
            
            // Remove existing highlights
            const highlighted = iframeDocument.querySelectorAll('.themit-highlight');
            highlighted.forEach(el => {
                el.classList.remove('themit-highlight');
            });
            
            // Add highlight to selected element
            element.classList.add('themit-highlight');
            
            // Apply highlight styles if they don't exist
            if (!iframeDocument.getElementById('themit-highlight-styles')) {
                const style = iframeDocument.createElement('style');
                style.id = 'themit-highlight-styles';
                style.textContent = `
                    .themit-highlight {
                        outline: 2px solid #007bff !important;
                        outline-offset: 2px !important;
                    }
                `;
                iframeDocument.head.appendChild(style);
            }
        } catch (error) {
            console.error('Error highlighting element:', error);
        }
    }
    
    /**
     * Set up the build button functionality
     */
    private setupBuildButton(): void {
        const buildButton = document.getElementById('build-button');
        if (buildButton) {
            buildButton.addEventListener('click', () => {
                // Show loading indicator
                buildButton.classList.add('loading');
                buildButton.textContent = 'Building...';
                
                // Attempt to build the project
                window['electron'].buildProject()
                    .then(() => {
                        // Show success
                        buildButton.classList.remove('loading');
                        buildButton.classList.add('success');
                        buildButton.textContent = 'Build Complete';
                        
                        // Reset after a delay
                        setTimeout(() => {
                            buildButton.classList.remove('success');
                            buildButton.textContent = 'Build Project';
                        }, 2000);
                    })
                    .catch((error: Error) => {
                        // Show error
                        buildButton.classList.remove('loading');
                        buildButton.classList.add('error');
                        buildButton.textContent = 'Build Failed';
                        console.error('Build error:', error);
                        
                        // Reset after a delay
                        setTimeout(() => {
                            buildButton.classList.remove('error');
                            buildButton.textContent = 'Build Project';
                        }, 2000);
                    });
            });
        }
    }
    
    /**
     * Get file extension from a path
     */
    private getFileExtension(filepath: string): string {
        const lastDotIndex = filepath.lastIndexOf('.');
        if (lastDotIndex === -1) return '';
        return filepath.substring(lastDotIndex);
    }
}
