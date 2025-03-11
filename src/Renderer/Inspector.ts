// Inspector.ts
import { Bus } from './Bus';
import { TH_NODE_SELECTED } from './Actions';

export class Inspector {
    private element: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private selectedElement: HTMLElement | null = null;

    constructor(private bus: Bus) {
        this.element = document.getElementById('inspector-content')!;
        this.canvas = document.getElementById('inspector-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        
        // Set canvas size to match container
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Subscribe to node selection events
        this.bus.on(TH_NODE_SELECTED).subscribe((action) => {
            this.selectedElement = action.payload.element;
            this.displayCSSInfo(this.selectedElement!);
        });
    }
    
    private resizeCanvas(): void {
        const container = this.element;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Redraw if we have a selected element
        if (this.selectedElement) {
            this.displayCSSInfo(this.selectedElement);
        }
    }
    
    private displayCSSInfo(element: HTMLElement): void {
        // Clear the inspector content first
        this.clearInspector();
        
        if (!element) return;
        
        // Create a container for CSS properties
        const propertiesContainer = document.createElement('div');
        propertiesContainer.className = 'css-properties';
        
        // Get computed styles
        const computedStyle = window.getComputedStyle(element);
        
        // Important CSS categories to display
        const cssCategories = [
            { title: 'Box Model', properties: ['width', 'height', 'padding', 'margin', 'border'] },
            { title: 'Position', properties: ['position', 'top', 'right', 'bottom', 'left', 'z-index'] },
            { title: 'Typography', properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'text-align'] },
            { title: 'Background', properties: ['background-color', 'background-image', 'background-position', 'background-size'] },
            { title: 'Display', properties: ['display', 'visibility', 'opacity', 'overflow'] },
            { title: 'Flexbox', properties: ['flex-direction', 'justify-content', 'align-items', 'flex-wrap'] }
        ];
        
        // Create sections for each category
        cssCategories.forEach(category => {
            const categorySection = document.createElement('div');
            categorySection.className = 'css-category';
            
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = category.title;
            categorySection.appendChild(categoryTitle);
            
            const propertiesList = document.createElement('div');
            propertiesList.className = 'property-list';
            
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
                    propertiesList.appendChild(propertyItem);
                }
            });
            
            categorySection.appendChild(propertiesList);
            propertiesContainer.appendChild(categorySection);
        });
        
        // Draw box model visualization on canvas
        this.drawBoxModel(element, computedStyle);
        
        // Add the properties container to the inspector
        this.element.appendChild(propertiesContainer);
    }
    
    private clearInspector(): void {
        // Clear everything except the canvas
        Array.from(this.element.children).forEach(child => {
            if (child !== this.canvas) {
                this.element.removeChild(child);
            }
        });
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    private drawBoxModel(element: HTMLElement, style: CSSStyleDeclaration): void {
        // Parse dimensions
        const width = parseInt(style.getPropertyValue('width'));
        const height = parseInt(style.getPropertyValue('height'));
        
        // Parse padding
        const paddingTop = parseInt(style.getPropertyValue('padding-top'));
        const paddingRight = parseInt(style.getPropertyValue('padding-right'));
        const paddingBottom = parseInt(style.getPropertyValue('padding-bottom'));
        const paddingLeft = parseInt(style.getPropertyValue('padding-left'));
        
        // Parse margins
        const marginTop = parseInt(style.getPropertyValue('margin-top'));
        const marginRight = parseInt(style.getPropertyValue('margin-right'));
        const marginBottom = parseInt(style.getPropertyValue('margin-bottom'));
        const marginLeft = parseInt(style.getPropertyValue('margin-left'));
        
        // Parse borders
        const borderTopWidth = parseInt(style.getPropertyValue('border-top-width'));
        const borderRightWidth = parseInt(style.getPropertyValue('border-right-width'));
        const borderBottomWidth = parseInt(style.getPropertyValue('border-bottom-width'));
        const borderLeftWidth = parseInt(style.getPropertyValue('border-left-width'));
        
        // Calculate total dimensions
        const totalWidth = width + paddingLeft + paddingRight + borderLeftWidth + borderRightWidth;
        const totalHeight = height + paddingTop + paddingBottom + borderTopWidth + borderBottomWidth;
        
        // Calculate canvas dimensions and scaling
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const maxBoxSize = Math.min(canvasWidth * 0.8, canvasHeight * 0.8);
        
        // Scale factor to fit the box model in the canvas
        const scale = Math.min(
            maxBoxSize / (totalWidth + marginLeft + marginRight),
            maxBoxSize / (totalHeight + marginTop + marginBottom)
        );
        
        // Center point
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Draw margin box (light gray)
        this.ctx.fillStyle = 'rgba(211, 211, 211, 0.5)';
        this.ctx.fillRect(
            centerX - (totalWidth / 2 + marginLeft) * scale,
            centerY - (totalHeight / 2 + marginTop) * scale,
            (totalWidth + marginLeft + marginRight) * scale,
            (totalHeight + marginTop + marginBottom) * scale
        );
        
        // Draw border box (dark gray)
        this.ctx.fillStyle = 'rgba(169, 169, 169, 0.7)';
        this.ctx.fillRect(
            centerX - totalWidth / 2 * scale,
            centerY - totalHeight / 2 * scale,
            totalWidth * scale,
            totalHeight * scale
        );
        
        // Draw padding box (light blue)
        this.ctx.fillStyle = 'rgba(173, 216, 230, 0.7)';
        this.ctx.fillRect(
            centerX - (width / 2 + paddingLeft) * scale,
            centerY - (height / 2 + paddingTop) * scale,
            (width + paddingLeft + paddingRight) * scale,
            (height + paddingTop + paddingBottom) * scale
        );
        
        // Draw content box (white)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(
            centerX - width / 2 * scale,
            centerY - height / 2 * scale,
            width * scale,
            height * scale
        );
        
        // Add labels
        this.ctx.fillStyle = '#000';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        // Content dimensions
        this.ctx.fillText(
            `${width} × ${height}`,
            centerX,
            centerY
        );
        
        // Add margin labels
        if (marginTop > 0) {
            this.ctx.fillText(
                `margin-top: ${marginTop}px`,
                centerX,
                centerY - (totalHeight / 2 + marginTop / 2) * scale
            );
        }
        
        if (marginBottom > 0) {
            this.ctx.fillText(
                `margin-bottom: ${marginBottom}px`,
                centerX,
                centerY + (totalHeight / 2 + marginBottom / 2) * scale
            );
        }
        
        if (marginLeft > 0) {
            this.ctx.fillText(
                `margin-left: ${marginLeft}px`,
                centerX - (totalWidth / 2 + marginLeft / 2) * scale,
                centerY
            );
        }
        
        if (marginRight > 0) {
            this.ctx.fillText(
                `margin-right: ${marginRight}px`,
                centerX + (totalWidth / 2 + marginRight / 2) * scale,
                centerY
            );
        }
    }
}