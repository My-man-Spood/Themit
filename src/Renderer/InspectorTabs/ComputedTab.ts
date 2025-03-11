// ComputedTab.ts
import { BoxModelVisualizer } from './BoxModelVisualizer';

export class ComputedTab {
    private container: HTMLElement;
    private canvas: HTMLCanvasElement;
    private boxModelVisualizer: BoxModelVisualizer;
    private categoryElements: { [key: string]: HTMLElement } = {};

    constructor(container: HTMLElement, canvas: HTMLCanvasElement, categoryElements: { [key: string]: HTMLElement }) {
        this.container = container;
        this.canvas = canvas;
        this.boxModelVisualizer = new BoxModelVisualizer(canvas);
        this.categoryElements = categoryElements;
    }

    public display(element: HTMLElement): void {
        // Clear previous info
        this.clear();
        
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
        this.boxModelVisualizer.draw(element, computedStyle);
    }

    public clear(): void {
        // Clear all property lists
        Object.values(this.categoryElements).forEach(element => {
            if (element) {
                element.innerHTML = '';
            }
        });
        
        // Clear the canvas
        this.boxModelVisualizer.clear();
    }

    public resizeCanvas(): void {
        const container = this.container;
        this.canvas.width = container.clientWidth;
        this.canvas.height = 200;
        
        // Resize the box model visualizer
        this.boxModelVisualizer.resize();
    }
}
