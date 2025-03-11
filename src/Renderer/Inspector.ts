// Inspector.ts
import { Bus } from './Bus';
import { TH_NODE_SELECTED } from './Actions';

export class Inspector {
    private element: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private selectedElement: HTMLElement | null = null;
    private cssPropertiesContainer: HTMLElement;
    private categoryElements: { [key: string]: HTMLElement } = {};
    private tabsContainer: HTMLElement;
    private tabContents: { [key: string]: HTMLElement } = {};
    private activeTab: string = 'stylesheets';

    constructor(private bus: Bus) {
        this.element = document.getElementById('inspector-content')!;
        this.canvas = document.getElementById('inspector-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.cssPropertiesContainer = document.getElementById('css-properties')!;
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
            this.selectedElement = action.payload.element;
            this.displayCSSInfo(this.selectedElement!);
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
        selectedTab?.classList.add('active');
        
        this.tabContents[tabName].classList.add('active');
        
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
        // Clear the inspector content first
        this.clearInspector();
        
        if (!element) return;
        
        // Get computed styles
        const computedStyle = window.getComputedStyle(element);
        
        // Important CSS categories to display with their properties
        const cssCategories = [
            { title: 'Box Model', properties: ['width', 'height', 'padding', 'margin', 'border'] },
            { title: 'Position', properties: ['position', 'top', 'right', 'bottom', 'left', 'z-index'] },
            { title: 'Typography', properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'text-align'] },
            { title: 'Background', properties: ['background-color', 'background-image', 'background-position', 'background-size'] },
            { title: 'Display', properties: ['display', 'visibility', 'opacity', 'overflow'] },
            { title: 'Flexbox', properties: ['flex-direction', 'justify-content', 'align-items', 'flex-wrap'] }
        ];
        
        // Populate each category with properties
        cssCategories.forEach(category => {
            const categoryElement = this.categoryElements[category.title];
            if (!categoryElement) return;
            
            // Clear previous properties
            categoryElement.innerHTML = '';
            
            // Add each property in this category
            category.properties.forEach(prop => {
                const value = computedStyle.getPropertyValue(prop);
                if (value) {
                    const propertyItem = document.createElement('div');
                    propertyItem.className = 'property-item';
                    
                    const propName = document.createElement('span');
                    propName.className = 'property-name';
                    propName.textContent = prop + ':';
                    
                    const propValue = document.createElement('span');
                    propValue.className = 'property-value';
                    propValue.textContent = value;
                    
                    propertyItem.appendChild(propName);
                    propertyItem.appendChild(propValue);
                    categoryElement.appendChild(propertyItem);
                }
            });
        });
        
        // Draw box model visualization on canvas
        this.drawBoxModel(element, computedStyle);
    }
    
    private clearInspector(): void {
        // Clear all property lists
        Object.values(this.categoryElements).forEach(element => {
            element.innerHTML = '';
        });
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    private drawBoxModel(element: HTMLElement, style: CSSStyleDeclaration): void {
        // Parse dimensions - ensure we have valid numbers
        const width = parseInt(style.getPropertyValue('width')) || 0;
        const height = parseInt(style.getPropertyValue('height')) || 0;
        
        // Parse padding - ensure we have valid numbers
        const paddingTop = parseInt(style.getPropertyValue('padding-top')) || 0;
        const paddingRight = parseInt(style.getPropertyValue('padding-right')) || 0;
        const paddingBottom = parseInt(style.getPropertyValue('padding-bottom')) || 0;
        const paddingLeft = parseInt(style.getPropertyValue('padding-left')) || 0;
        
        // Parse margins - ensure we have valid numbers
        const marginTop = parseInt(style.getPropertyValue('margin-top')) || 0;
        const marginRight = parseInt(style.getPropertyValue('margin-right')) || 0;
        const marginBottom = parseInt(style.getPropertyValue('margin-bottom')) || 0;
        const marginLeft = parseInt(style.getPropertyValue('margin-left')) || 0;
        
        // Parse borders - ensure we have valid numbers
        const borderTopWidth = parseInt(style.getPropertyValue('border-top-width')) || 0;
        const borderRightWidth = parseInt(style.getPropertyValue('border-right-width')) || 0;
        const borderBottomWidth = parseInt(style.getPropertyValue('border-bottom-width')) || 0;
        const borderLeftWidth = parseInt(style.getPropertyValue('border-left-width')) || 0;
        
        // Calculate canvas dimensions
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Center point
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Clear the canvas first
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw a background grid for reference
        this.drawGrid(canvasWidth, canvasHeight);
        
        // Define standard spacing between boxes (same on all sides)
        const boxSpacing = Math.min(canvasWidth, canvasHeight) * 0.075; // 5% of the smaller canvas dimension
        
        // Start with content box dimensions
        const contentBoxWidth = Math.min(canvasWidth, canvasHeight) * 0.85;
        const contentBoxHeight = Math.min(canvasWidth, canvasHeight) * 0.45;
        
        // Calculate other box dimensions by adding consistent spacing on all sides
        const paddingBoxWidth = contentBoxWidth + (boxSpacing * 4);
        const paddingBoxHeight = contentBoxHeight + (boxSpacing * 2);
        
        const borderBoxWidth = paddingBoxWidth + (boxSpacing * 4);
        const borderBoxHeight = paddingBoxHeight + (boxSpacing * 2);
        
        const marginBoxWidth = borderBoxWidth + (boxSpacing * 4);
        const marginBoxHeight = borderBoxHeight + (boxSpacing * 2);
        
        // Draw margin box (light gray)
        this.ctx.fillStyle = 'rgba(211, 211, 211, 0.5)';
        this.ctx.fillRect(
            centerX - marginBoxWidth / 2,
            centerY - marginBoxHeight / 2,
            marginBoxWidth,
            marginBoxHeight
        );
        
        // Draw margin values
        this.drawBoxValue(marginTop, centerX, centerY - borderBoxHeight / 2 - boxSpacing / 2);
        this.drawBoxValue(marginRight, centerX + borderBoxWidth / 2 + boxSpacing / 4, centerY);
        this.drawBoxValue(marginBottom, centerX, centerY + borderBoxHeight / 2 + boxSpacing / 2);
        this.drawBoxValue(marginLeft, centerX - borderBoxWidth / 2 - boxSpacing / 4, centerY);
        
        // Draw border box (dark gray)
        this.ctx.fillStyle = 'rgba(169, 169, 169, 0.7)';
        this.ctx.fillRect(
            centerX - borderBoxWidth / 2,
            centerY - borderBoxHeight / 2,
            borderBoxWidth,
            borderBoxHeight
        );
        
        // Draw border values
        this.drawBoxValue(borderTopWidth, centerX, centerY - paddingBoxHeight / 2 - boxSpacing / 2);
        this.drawBoxValue(borderRightWidth, centerX + paddingBoxWidth / 2 + boxSpacing / 2, centerY);
        this.drawBoxValue(borderBottomWidth, centerX, centerY + paddingBoxHeight / 2 + boxSpacing / 2);
        this.drawBoxValue(borderLeftWidth, centerX - paddingBoxWidth / 2 - boxSpacing / 2, centerY);
        
        // Draw padding box (light blue)
        this.ctx.fillStyle = 'rgba(173, 216, 230, 0.7)';
        this.ctx.fillRect(
            centerX - paddingBoxWidth / 2,
            centerY - paddingBoxHeight / 2,
            paddingBoxWidth,
            paddingBoxHeight
        );
        
        // Draw padding values
        this.drawBoxValue(paddingTop, centerX, centerY - contentBoxHeight / 2 - boxSpacing / 2);
        this.drawBoxValue(paddingRight, centerX + contentBoxWidth / 2 + boxSpacing / 2, centerY);
        this.drawBoxValue(paddingBottom, centerX, centerY + contentBoxHeight / 2 + boxSpacing / 2);
        this.drawBoxValue(paddingLeft, centerX - contentBoxWidth / 2 - boxSpacing / 2, centerY);
        
        // Draw content box (white)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(
            centerX - contentBoxWidth / 2,
            centerY - contentBoxHeight / 2,
            contentBoxWidth,
            contentBoxHeight
        );
        
        // Add content dimensions in the center
        this.ctx.fillStyle = '#000';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `${width} × ${height}px`,
            centerX,
            centerY
        );
    }
    
    private drawBoxValue(value: number, x: number, y: number): void {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${value}px`, x, y);
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