import { Bus } from './Bus';
import { TH_NODE_SELECTED } from './Actions';
import { StylesheetsTab } from './InspectorTabs/StylesheetsTab';
import { ComputedTab } from './InspectorTabs/ComputedTab';

export class Inspector {
    private element: HTMLElement;
    private contentElement: HTMLElement;
    private bus: Bus;
    private selectedElement: HTMLElement | null = null;
    
    // Tab containers
    private computedContainer: HTMLElement | null = null;
    private stylesheetsContainer: HTMLElement | null = null;
    
    // Tab navigation elements
    private computedTab: HTMLElement | null = null;
    private stylesheetsTab: HTMLElement | null = null;
    
    // Box model canvas
    private boxModelCanvas: HTMLCanvasElement | null = null;
    
    // Property categories
    private categoryElements: { [key: string]: HTMLElement } = {};
    
    // Tab instances
    private computedTabInstance: ComputedTab | null = null;
    private stylesheetsTabInstance: StylesheetsTab | null = null;

    constructor(bus: Bus) {
        this.bus = bus;
        this.element = document.getElementById('inspector')!;
        this.contentElement = document.getElementById('inspector-content')!;
        
        this.initializeInspector();
        this.setupEventListeners();
    }

    private initializeInspector(): void {
        // Use existing tab navigation if it exists, otherwise create it
        let tabNav = document.getElementById('inspector-tabs');
        
        if (!tabNav) {
            // Create tab navigation
            tabNav = document.createElement('div');
            tabNav.className = 'tabs';
            tabNav.id = 'inspector-tabs';
            
            this.contentElement.appendChild(tabNav);
        } else {
            // Clear existing tabs
            tabNav.innerHTML = '';
        }
        
        // Create tab buttons
        this.computedTab = document.createElement('div');
        this.computedTab.className = 'tab-item';
        this.computedTab.textContent = 'Computed';
        this.computedTab.setAttribute('data-tab', 'computed');
        this.computedTab.addEventListener('click', () => this.switchTab('computed'));
        
        this.stylesheetsTab = document.createElement('div');
        this.stylesheetsTab.className = 'tab-item active';
        this.stylesheetsTab.textContent = 'Stylesheets';
        this.stylesheetsTab.setAttribute('data-tab', 'stylesheets');
        this.stylesheetsTab.addEventListener('click', () => this.switchTab('stylesheets'));
        
        tabNav.appendChild(this.stylesheetsTab);
        tabNav.appendChild(this.computedTab);
        
        // Create or get tab content container
        let tabContentContainer = document.getElementById('inspector-tab-content');
        if (!tabContentContainer) {
            tabContentContainer = document.createElement('div');
            tabContentContainer.id = 'inspector-tab-content';
            this.contentElement.appendChild(tabContentContainer);
        } else {
            // Clear existing content
            tabContentContainer.innerHTML = '';
        }
        
        // Create tab containers
        this.stylesheetsContainer = document.createElement('div');
        this.stylesheetsContainer.className = 'tab-content active';
        this.stylesheetsContainer.id = 'stylesheets-tab';
        
        this.computedContainer = document.createElement('div');
        this.computedContainer.className = 'tab-content';
        this.computedContainer.id = 'computed-tab';
        
        tabContentContainer.appendChild(this.stylesheetsContainer);
        tabContentContainer.appendChild(this.computedContainer);
        
        // Create box model visualization
        const boxModelSection = document.createElement('div');
        boxModelSection.className = 'box-model-section';
        
        const boxModelTitle = document.createElement('h3');
        boxModelTitle.textContent = 'Box Model';
        boxModelSection.appendChild(boxModelTitle);
        
        this.boxModelCanvas = document.createElement('canvas');
        this.boxModelCanvas.className = 'box-model-canvas';
        this.boxModelCanvas.id = 'inspector-canvas';
        boxModelSection.appendChild(this.boxModelCanvas);
        
        if (this.computedContainer) {
            this.computedContainer.appendChild(boxModelSection);
        }
        
        // Create property categories
        const categories = ['Box Model', 'Position', 'Typography', 'Background', 'Display', 'Flexbox'];
        
        categories.forEach(category => {
            const categorySection = document.createElement('div');
            categorySection.className = 'css-category';
            
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = category;
            categorySection.appendChild(categoryTitle);
            
            const categoryContent = document.createElement('div');
            categoryContent.className = 'property-list';
            categorySection.appendChild(categoryContent);
            
            // Store reference to the category content element
            const categoryId = category.toLowerCase().replace(' ', '-') + '-properties';
            categoryContent.id = categoryId;
            this.categoryElements[category] = categoryContent;
            
            if (this.computedContainer) {
                this.computedContainer.appendChild(categorySection);
            }
        });
        
        // Initialize tab instances
        if (this.boxModelCanvas && this.computedContainer && this.stylesheetsContainer) {
            this.computedTabInstance = new ComputedTab(
                this.computedContainer,
                this.boxModelCanvas,
                this.categoryElements
            );
            
            this.stylesheetsTabInstance = new StylesheetsTab(
                this.stylesheetsContainer
            );
            
            // Set initial canvas size
            this.resizeCanvas();
            
            // Add resize listener
            window.addEventListener('resize', () => {
                this.resizeCanvas();
            });
        }
    }

    private setupEventListeners(): void {
        this.bus.on(TH_NODE_SELECTED).subscribe((action) => {
            // Get the selected node from the hierarchy
            const selectedNode = action.payload.element;
            
            // Find the actual HTML element in the document using the data-th attribute
            const thId = selectedNode.getAttribute('data-th');
            if (thId) {
                // Find the viewport element that contains the rendered content
                const viewport = document.getElementById('viewport');
                if (viewport) {
                    // Find the element with matching data-th in the viewport
                    this.selectedElement = viewport.querySelector(`[data-th="${thId}"]`) as HTMLElement;
                    if (this.selectedElement) {
                        this.displayElementInfo(this.selectedElement);
                    } else {
                        console.warn(`Could not find element with data-th: ${thId} in viewport`);
                        this.clearInspector();
                        
                        // Display a message in the stylesheets tab
                        if (this.stylesheetsContainer) {
                            this.stylesheetsContainer.innerHTML = '';
                            const noElement = document.createElement('div');
                            noElement.className = 'no-rules';
                            noElement.textContent = 'Element not found in the document.';
                            this.stylesheetsContainer.appendChild(noElement);
                        }
                    }
                } else {
                    console.warn('No viewport element found');
                    this.clearInspector();
                }
            } else {
                // If no data-th is found, use the element directly (fallback)
                this.selectedElement = selectedNode;
                if (this.selectedElement) {
                    this.displayElementInfo(this.selectedElement);
                }
            }
        });
    }

    private displayElementInfo(element: HTMLElement): void {
        // Display information in both tabs
        if (this.computedTabInstance) {
            this.computedTabInstance.display(element);
        }
        
        if (this.stylesheetsTabInstance) {
            this.stylesheetsTabInstance.display(element);
        }
    }

    private switchTab(tabName: string): void {
        // Update tab navigation
        if (this.computedTab && this.stylesheetsTab) {
            this.computedTab.className = 'tab-item' + (tabName === 'computed' ? ' active' : '');
            this.stylesheetsTab.className = 'tab-item' + (tabName === 'stylesheets' ? ' active' : '');
        }
        
        // Update tab content visibility
        if (this.computedContainer && this.stylesheetsContainer) {
            this.computedContainer.className = 'tab-content' + (tabName === 'computed' ? ' active' : '');
            this.stylesheetsContainer.className = 'tab-content' + (tabName === 'stylesheets' ? ' active' : '');
        }
        
        // Resize canvas if switching to computed tab
        if (tabName === 'computed') {
            this.resizeCanvas();
        }
    }

    private resizeCanvas(): void {
        if (this.computedTabInstance && this.boxModelCanvas) {
            this.computedTabInstance.resizeCanvas();
        }
    }

    private clearInspector(): void {
        // Clear both tabs
        if (this.computedTabInstance) {
            this.computedTabInstance.clear();
        }
        
        if (this.stylesheetsTabInstance) {
            this.stylesheetsTabInstance.clear();
        }
    }
    
    /**
     * Public method to inspect an element from external sources (like iframe)
     * @param element The HTML element to inspect
     */
    public inspectElement(element: HTMLElement): void {
        if (element) {
            this.selectedElement = element;
            this.displayElementInfo(element);
        }
    }
}