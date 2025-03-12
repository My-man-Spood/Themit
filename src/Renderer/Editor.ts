import * as Cheerio from 'cheerio';
import { Hierarchy } from './Hiererchy';
import { FileHolder } from './entities/FileHolder';
import { Bus } from './Bus';
import { TH_DOCUMENT_LOADED, TH_PROJECT_LOADED, TH_READ_FILE_REQUEST } from './Actions';
import { FileBrowser } from './FileBrowser';
import { THProject } from '../lib/THProject';
import { Inspector } from './Inspector';

// Define new action types
export const TH_PROJECT_PREVIEW_LOADED = 'TH_PROJECT_PREVIEW_LOADED';
export const TH_PROJECT_PREVIEW_ERROR = 'TH_PROJECT_PREVIEW_ERROR';

export class Editor {
    private file: FileHolder;
    private hierarchy: Hierarchy;
    private fileBrowser: FileBrowser;
    private inspector: Inspector;
    private thProject: THProject;
    private bus: Bus;
    private previewIframe: HTMLIFrameElement | null = null;
    private devServerUrl: string = '';
    private isDevServerRunning: boolean = false;

    constructor() {
        this.bus = new Bus();
        this.hierarchy = new Hierarchy(this.bus);
        this.inspector = new Inspector(this.bus);
        this.fileBrowser = new FileBrowser(this.bus, {
            readDir: (path: string) => window['electron'].readDirectory(path),
        });

        Promise.all([window['electron'].loadProject(), this.startDevServer()]).then((values) => {
            this.thProject = values[0];
            this.bus.push(TH_PROJECT_LOADED, this.thProject);
            
            // Check if dev server is already running
            this.checkDevServerStatus();
            
            // Add build and preview button functionality
            this.setupBuildButton();
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

            // Only update innerHTML if we're not in preview mode
            if (!this.isDevServerRunning) {
                document.getElementById('viewport')!.innerHTML = this.file.asHTML();
            }
        });
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
                
                // If we have a file open, show it
                if (this.file) {
                    viewportElement.innerHTML = this.file.asHTML();
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
        
        // Add event listeners
        iframe.addEventListener('load', () => {
            console.log('Preview iframe loaded');
            this.setupIframeInteraction(iframe);
        });
        
        iframe.addEventListener('error', (e) => {
            console.error('Error loading preview iframe', e);
            viewportElement.innerHTML = `<div class="error">Failed to load preview: ${e}</div>`;
        });
        
        viewportElement.appendChild(iframe);
        this.previewIframe = iframe;
    }
    
    /**
     * Set up interaction with elements in the iframe
     */
    private setupIframeInteraction(iframe: HTMLIFrameElement): void {
        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
            
            if (!iframeDocument) {
                console.error('Could not access iframe document');
                return;
            }
            
            // Add click event listener to capture element selection
            iframeDocument.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target as HTMLElement;
                
                // Highlight the selected element
                this.highlightElement(target);
                
                // Inspect the element (pass it to inspector)
                if (this.inspector) {
                    this.inspector.inspectElement(target);
                }
            }, true);
            
        } catch (error) {
            console.error('Error setting up iframe interaction', error);
        }
    }
    
    /**
     * Highlight an element in the iframe
     */
    private highlightElement(element: HTMLElement): void {
        try {
            // Remove previous highlights
            const iframeDocument = this.previewIframe?.contentDocument || this.previewIframe?.contentWindow?.document;
            
            if (!iframeDocument) return;
            
            // Remove any existing highlights
            const existingHighlights = iframeDocument.querySelectorAll('.themit-highlight');
            existingHighlights.forEach((el) => {
                (el as HTMLElement).style.outline = '';
                el.classList.remove('themit-highlight');
            });
            
            // Add highlight to the clicked element
            element.classList.add('themit-highlight');
            element.style.outline = '2px solid #007bff';
            
            console.log('Selected element:', element);
        } catch (error) {
            console.error('Error highlighting element', error);
        }
    }
    
    /**
     * Set up the build button functionality
     */
    private setupBuildButton(): void {
        const buildButton = document.getElementById('build');
        
        if (buildButton) {
            buildButton.addEventListener('click', () => {
                // Check if dev server is running
                if (this.isDevServerRunning) {
                    // Stop the server if it's running
                    this.stopDevServer();
                    buildButton.textContent = 'build';
                } else {
                    // Start the server if it's not running
                    this.startDevServer().then(() => {
                        buildButton.textContent = 'stop';
                    });
                }
            });
        }
    }
}
