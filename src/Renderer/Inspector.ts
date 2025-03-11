// Inspector.ts
import { Bus } from './Bus';
import { TH_NODE_SELECTED } from './Actions';

export class Inspector {
    private element: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private selectedElement: HTMLElement | null = null;
    private cssPropertiesContainer: HTMLElement;
    private stylesheetsContainer: HTMLElement;
    private categoryElements: { [key: string]: HTMLElement } = {};
    private tabsContainer: HTMLElement;
    private tabContents: { [key: string]: HTMLElement } = {};
    private activeTab: string = 'stylesheets';

    constructor(private bus: Bus) {
        this.element = document.getElementById('inspector-content')!;
        this.canvas = document.getElementById('inspector-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.cssPropertiesContainer = document.getElementById('css-properties')!;
        this.stylesheetsContainer = document.getElementById('stylesheets-tab')!;
        this.tabsContainer = document.getElementById('inspector-tabs')!;
        
        // Initialize tab contents
        this.tabContents = {
            'stylesheets': document.getElementById('stylesheets-tab')!,
            'computed': document.getElementById('computed-tab')!
        };
        
        // Initialize category elements
        this.categoryElements = {
            'Box Model': document.getElementById('box-model-properties')!,
            'Position': document.getElementById('position-properties')!,
            'Typography': document.getElementById('typography-properties')!,
            'Background': document.getElementById('background-properties')!,
            'Display': document.getElementById('display-properties')!,
            'Flexbox': document.getElementById('flexbox-properties')!
        };
        
        // Set up tab click handlers
        this.setupTabHandlers();
        
        // Set canvas size to match container
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Subscribe to node selection events
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
                        this.displayCSSInfo(this.selectedElement);
                        this.displayStylesheetRules(this.selectedElement);
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
                    this.displayCSSInfo(this.selectedElement);
                    this.displayStylesheetRules(this.selectedElement);
                }
            }
        });
    }
    
    private setupTabHandlers(): void {
        const tabItems = this.tabsContainer.querySelectorAll('.tab-item');
        
        tabItems.forEach(tab => {
            tab.addEventListener('click', () => {
                // Get the tab name from data attribute
                const tabName = tab.getAttribute('data-tab')!;
                
                // Switch to the selected tab
                this.switchTab(tabName);
            });
        });
    }
    
    private switchTab(tabName: string): void {
        // Update active tab
        this.activeTab = tabName;
        
        // Remove active class from all tabs and tab contents
        const tabItems = this.tabsContainer.querySelectorAll('.tab-item');
        tabItems.forEach(tab => tab.classList.remove('active'));
        
        Object.values(this.tabContents).forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to selected tab and content
        const selectedTab = this.tabsContainer.querySelector(`[data-tab="${tabName}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        if (this.tabContents[tabName]) {
            this.tabContents[tabName].classList.add('active');
        }
        
        // If switching to the computed tab and we have a selected element, redraw
        if (tabName === 'computed' && this.selectedElement) {
            this.resizeCanvas();
        }
    }
    
    private resizeCanvas(): void {
        const container = this.element;
        this.canvas.width = container.clientWidth;
        this.canvas.height = 200; // Fixed height for canvas
        
        // Redraw if we have a selected element
        if (this.selectedElement) {
            this.displayCSSInfo(this.selectedElement);
        }
    }
    
    private displayCSSInfo(element: HTMLElement): void {
        // Clear previous info
        this.clearInspector();
        
        // Get computed style directly from the document
        const computedStyle = window.getComputedStyle(element);
        
        // Define property categories
        const categories: { [key: string]: string[] } = {
            'Box Model': [
                'width', 'height', 'padding', 'padding-top', 'padding-right', 
                'padding-bottom', 'padding-left', 'margin', 'margin-top', 
                'margin-right', 'margin-bottom', 'margin-left', 'box-sizing'
            ],
            'Position': [
                'position', 'top', 'right', 'bottom', 'left', 'z-index'
            ],
            'Typography': [
                'font-family', 'font-size', 'font-weight', 'line-height', 
                'text-align', 'color', 'text-decoration'
            ],
            'Background': [
                'background', 'background-color', 'background-image', 
                'background-position', 'background-size', 'background-repeat'
            ],
            'Display': [
                'display', 'visibility', 'opacity', 'overflow'
            ],
            'Flexbox': [
                'flex', 'flex-direction', 'flex-wrap', 'justify-content', 
                'align-items', 'align-content', 'gap'
            ]
        };
        
        // Populate each category
        Object.entries(categories).forEach(([category, properties]) => {
            const categoryElement = this.categoryElements[category];
            
            properties.forEach(prop => {
                const value = computedStyle.getPropertyValue(prop);
                
                if (value) {
                    const propertyItem = document.createElement('div');
                    propertyItem.className = 'property-item';
                    
                    const propName = document.createElement('div');
                    propName.className = 'property-name';
                    propName.textContent = prop;
                    
                    const propValue = document.createElement('div');
                    propValue.className = 'property-value';
                    propValue.textContent = value;
                    
                    propertyItem.appendChild(propName);
                    propertyItem.appendChild(propValue);
                    if (categoryElement) {
                        categoryElement.appendChild(propertyItem);
                    }
                }
            });
        });
        
        // Draw box model visualization
        this.drawBoxModel(element, computedStyle);
    }
    
    private displayStylesheetRules(element: HTMLElement): void {
        // Clear previous stylesheet info
        if (this.stylesheetsContainer) {
            this.stylesheetsContainer.innerHTML = '';
            this.stylesheetsContainer.className = 'stylesheet-rules';
        }
        
        // Create a container for the stylesheet rules
        const rulesContainer = document.createElement('div');
        rulesContainer.className = 'rules-container';
        
        // Get all stylesheets from the document
        const stylesheets = Array.from(document.styleSheets);
        
        // Track if we found any rules
        let foundRules = false;
        
        // Process each stylesheet
        stylesheets.forEach(stylesheet => {
            try {
                // Get all CSS rules from the stylesheet
                const cssRules = Array.from(stylesheet.cssRules || stylesheet.rules || []);
                
                // Create a container for this stylesheet's rules
                const stylesheetContainer = document.createElement('div');
                stylesheetContainer.className = 'stylesheet-container';
                
                // Track if we found any matching rules in this stylesheet
                let foundInStylesheet = false;
                
                // Add stylesheet information header
                const stylesheetHeader = document.createElement('div');
                stylesheetHeader.className = 'stylesheet-header';
                
                // Get the stylesheet source
                let source = 'inline';
                if (stylesheet.href) {
                    // Extract filename from the full path
                    const urlParts = stylesheet.href.split('/');
                    source = urlParts[urlParts.length - 1];
                } else if (stylesheet.ownerNode && (stylesheet.ownerNode as HTMLElement).tagName === 'STYLE') {
                    source = 'style tag';
                }
                
                stylesheetHeader.textContent = source;
                stylesheetContainer.appendChild(stylesheetHeader);
                
                // Process each rule in the stylesheet
                cssRules.forEach(rule => {
                    if (rule instanceof CSSStyleRule) {
                        // Check if this rule applies to our element
                        try {
                            if (element.matches(rule.selectorText)) {
                                foundRules = true;
                                foundInStylesheet = true;
                                
                                // Create rule container
                                const ruleContainer = document.createElement('div');
                                ruleContainer.className = 'rule-container';
                                
                                // Add selector
                                const selector = document.createElement('div');
                                selector.className = 'rule-selector';
                                selector.textContent = rule.selectorText;
                                ruleContainer.appendChild(selector);
                                
                                // Add declarations
                                const declarations = document.createElement('div');
                                declarations.className = 'rule-declarations';
                                
                                // Get all style declarations
                                const style = rule.style;
                                for (let i = 0; i < style.length; i++) {
                                    const propertyName = style[i];
                                    const propertyValue = style.getPropertyValue(propertyName);
                                    
                                    const declaration = document.createElement('div');
                                    declaration.className = 'declaration';
                                    
                                    const propName = document.createElement('span');
                                    propName.className = 'declaration-name';
                                    propName.textContent = propertyName;
                                    
                                    const propValue = document.createElement('span');
                                    propValue.className = 'declaration-value';
                                    propValue.textContent = propertyValue;
                                    
                                    declaration.appendChild(propName);
                                    declaration.appendChild(document.createTextNode(': '));
                                    declaration.appendChild(propValue);
                                    declaration.appendChild(document.createTextNode(';'));
                                    
                                    declarations.appendChild(declaration);
                                }
                                
                                ruleContainer.appendChild(declarations);
                                stylesheetContainer.appendChild(ruleContainer);
                            }
                        } catch (e) {
                            // Some selectors might cause errors when checking matches
                            // Just skip those
                            console.warn('Error checking selector:', rule.selectorText, e);
                        }
                    }
                });
                
                // Only add this stylesheet container if we found matching rules
                if (foundInStylesheet) {
                    rulesContainer.appendChild(stylesheetContainer);
                }
            } catch (e) {
                // Skip stylesheets that can't be accessed due to CORS
                console.warn('Could not access stylesheet:', e);
            }
        });
        
        // Add element inline styles if any exist
        if (element.style && element.style.length > 0) {
            foundRules = true;
            
            const inlineContainer = document.createElement('div');
            inlineContainer.className = 'stylesheet-container';
            
            const inlineHeader = document.createElement('div');
            inlineHeader.className = 'stylesheet-header';
            inlineHeader.textContent = 'element.style';
            inlineContainer.appendChild(inlineHeader);
            
            const ruleContainer = document.createElement('div');
            ruleContainer.className = 'rule-container';
            
            const declarations = document.createElement('div');
            declarations.className = 'rule-declarations';
            
            for (let i = 0; i < element.style.length; i++) {
                const propertyName = element.style[i];
                const propertyValue = element.style.getPropertyValue(propertyName);
                
                const declaration = document.createElement('div');
                declaration.className = 'declaration';
                
                const propName = document.createElement('span');
                propName.className = 'declaration-name';
                propName.textContent = propertyName;
                
                const propValue = document.createElement('span');
                propValue.className = 'declaration-value';
                propValue.textContent = propertyValue;
                
                declaration.appendChild(propName);
                declaration.appendChild(document.createTextNode(': '));
                declaration.appendChild(propValue);
                declaration.appendChild(document.createTextNode(';'));
                
                declarations.appendChild(declaration);
            }
            
            ruleContainer.appendChild(declarations);
            inlineContainer.appendChild(ruleContainer);
            rulesContainer.insertBefore(inlineContainer, rulesContainer.firstChild);
        }
        
        // If no rules were found, show a message
        if (!foundRules) {
            const noRules = document.createElement('div');
            noRules.className = 'no-rules';
            noRules.textContent = 'No CSS rules found for this element.';
            rulesContainer.appendChild(noRules);
        }
        
        // Add the rules container to the stylesheets tab
        if (this.stylesheetsContainer) {
            this.stylesheetsContainer.appendChild(rulesContainer);
        }
    }
    
    private clearInspector(): void {
        // Clear all property lists
        Object.values(this.categoryElements).forEach(element => {
            if (element) {
                element.innerHTML = '';
            }
        });
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    private drawBoxModel(element: HTMLElement, computedStyle: CSSStyleDeclaration): void {
        // Get the canvas dimensions
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw background grid
        this.drawGrid(canvasWidth, canvasHeight);
        
        // Define standard spacing between boxes (same on all sides)
        const boxSpacing = Math.min(canvasWidth, canvasHeight) * 0.075; // 7.5% of the smaller canvas dimension
        
        // Start with content box dimensions
        const contentBoxWidth = Math.min(canvasWidth, canvasHeight) * 0.85;
        const contentBoxHeight = contentBoxWidth * 0.6; // 3:2 aspect ratio
        
        // Calculate center position
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Calculate positions for each box
        const contentX = centerX - contentBoxWidth / 2;
        const contentY = centerY - contentBoxHeight / 2;
        
        // Parse box model values
        const padding = {
            top: parseFloat(computedStyle.getPropertyValue('padding-top')),
            right: parseFloat(computedStyle.getPropertyValue('padding-right')),
            bottom: parseFloat(computedStyle.getPropertyValue('padding-bottom')),
            left: parseFloat(computedStyle.getPropertyValue('padding-left'))
        };
        
        const border = {
            top: parseFloat(computedStyle.getPropertyValue('border-top-width')),
            right: parseFloat(computedStyle.getPropertyValue('border-right-width')),
            bottom: parseFloat(computedStyle.getPropertyValue('border-bottom-width')),
            left: parseFloat(computedStyle.getPropertyValue('border-left-width'))
        };
        
        const margin = {
            top: parseFloat(computedStyle.getPropertyValue('margin-top')),
            right: parseFloat(computedStyle.getPropertyValue('margin-right')),
            bottom: parseFloat(computedStyle.getPropertyValue('margin-bottom')),
            left: parseFloat(computedStyle.getPropertyValue('margin-left'))
        };
        
        // Normalize values (make them proportional to the canvas)
        const maxValue = Math.max(
            padding.top, padding.right, padding.bottom, padding.left,
            border.top, border.right, border.bottom, border.left,
            margin.top, margin.right, margin.bottom, margin.left
        );
        
        // If we have valid measurements, use them proportionally
        // Otherwise use default spacing
        const scaleFactor = maxValue > 0 ? boxSpacing / maxValue : 1;
        
        const scaledPadding = {
            top: Math.max(padding.top * scaleFactor, boxSpacing / 3),
            right: Math.max(padding.right * scaleFactor, boxSpacing / 3),
            bottom: Math.max(padding.bottom * scaleFactor, boxSpacing / 3),
            left: Math.max(padding.left * scaleFactor, boxSpacing / 3)
        };
        
        const scaledBorder = {
            top: Math.max(border.top * scaleFactor, boxSpacing / 6),
            right: Math.max(border.right * scaleFactor, boxSpacing / 6),
            bottom: Math.max(border.bottom * scaleFactor, boxSpacing / 6),
            left: Math.max(border.left * scaleFactor, boxSpacing / 6)
        };
        
        const scaledMargin = {
            top: Math.max(margin.top * scaleFactor, boxSpacing / 2),
            right: Math.max(margin.right * scaleFactor, boxSpacing / 2),
            bottom: Math.max(margin.bottom * scaleFactor, boxSpacing / 2),
            left: Math.max(margin.left * scaleFactor, boxSpacing / 2)
        };
        
        // Draw margin box (outermost)
        this.ctx.fillStyle = 'rgba(246, 178, 107, 0.3)';
        this.ctx.fillRect(
            contentX - scaledPadding.left - scaledBorder.left - scaledMargin.left,
            contentY - scaledPadding.top - scaledBorder.top - scaledMargin.top,
            contentBoxWidth + scaledPadding.left + scaledPadding.right + scaledBorder.left + scaledBorder.right + scaledMargin.left + scaledMargin.right,
            contentBoxHeight + scaledPadding.top + scaledPadding.bottom + scaledBorder.top + scaledBorder.bottom + scaledMargin.top + scaledMargin.bottom
        );
        
        // Draw border box
        this.ctx.fillStyle = 'rgba(222, 125, 44, 0.5)';
        this.ctx.fillRect(
            contentX - scaledPadding.left - scaledBorder.left,
            contentY - scaledPadding.top - scaledBorder.top,
            contentBoxWidth + scaledPadding.left + scaledPadding.right + scaledBorder.left + scaledBorder.right,
            contentBoxHeight + scaledPadding.top + scaledPadding.bottom + scaledBorder.top + scaledBorder.bottom
        );
        
        // Draw padding box
        this.ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
        this.ctx.fillRect(
            contentX - scaledPadding.left,
            contentY - scaledPadding.top,
            contentBoxWidth + scaledPadding.left + scaledPadding.right,
            contentBoxHeight + scaledPadding.top + scaledPadding.bottom
        );
        
        // Draw content box (innermost)
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.7)';
        this.ctx.fillRect(
            contentX,
            contentY,
            contentBoxWidth,
            contentBoxHeight
        );
        
        // Add labels
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        // Content label
        this.ctx.fillText('Content', centerX, centerY);
        
        // Padding label
        this.ctx.fillText('Padding', centerX, contentY - scaledPadding.top / 2);
        
        // Border label
        this.ctx.fillText('Border', centerX, contentY - scaledPadding.top - scaledBorder.top / 2);
        
        // Margin label
        this.ctx.fillText('Margin', centerX, contentY - scaledPadding.top - scaledBorder.top - scaledMargin.top / 2);
        
        // Add measurements
        this.ctx.font = '10px Arial';
        
        // Content measurements
        const contentWidth = Math.round(parseFloat(computedStyle.getPropertyValue('width')));
        const contentHeight = Math.round(parseFloat(computedStyle.getPropertyValue('height')));
        this.ctx.fillText(`${contentWidth}px × ${contentHeight}px`, centerX, centerY + 15);
        
        // Draw dimension lines
        this.drawDimensionLine(
            contentX - 10,
            contentY,
            contentX - 10,
            contentY + contentBoxHeight,
            `${contentHeight}px`
        );
        
        this.drawDimensionLine(
            contentX,
            contentY + contentBoxHeight + 10,
            contentX + contentBoxWidth,
            contentY + contentBoxHeight + 10,
            `${contentWidth}px`
        );
    }
    
    private drawDimensionLine(x1: number, y1: number, x2: number, y2: number, label: string): void {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'black';
        this.ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2);
    }
    
    private drawGrid(width: number, height: number): void {
        // Draw a light grid for reference
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.lineWidth = 0.5;
        
        // Vertical lines
        for (let x = 0; x < width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < height; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
}