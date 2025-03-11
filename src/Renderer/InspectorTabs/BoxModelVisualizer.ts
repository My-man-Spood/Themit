// BoxModelVisualizer.ts
export class BoxModelVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;
    }

    public resize(): void {
        // Redraw grid
        this.drawGrid();
    }

    public clear(): void {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public draw(element: HTMLElement, computedStyle: CSSStyleDeclaration): void {
        // Get the canvas dimensions
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw background grid
        this.drawGrid();
        
        // Get actual box model values
        const margin = {
            top: parseInt(computedStyle.marginTop) || 0,
            right: parseInt(computedStyle.marginRight) || 0,
            bottom: parseInt(computedStyle.marginBottom) || 0,
            left: parseInt(computedStyle.marginLeft) || 0
        };
        
        const border = {
            top: parseInt(computedStyle.borderTopWidth) || 0,
            right: parseInt(computedStyle.borderRightWidth) || 0,
            bottom: parseInt(computedStyle.borderBottomWidth) || 0,
            left: parseInt(computedStyle.borderLeftWidth) || 0
        };
        
        const padding = {
            top: parseInt(computedStyle.paddingTop) || 0,
            right: parseInt(computedStyle.paddingRight) || 0,
            bottom: parseInt(computedStyle.paddingBottom) || 0,
            left: parseInt(computedStyle.paddingLeft) || 0
        };
        
        const content = {
            width: parseInt(computedStyle.width) || 0,
            height: parseInt(computedStyle.height) || 0
        };
        
        // Calculate box dimensions
        const boxWidth = canvasWidth * 0.85;
        const boxHeight = canvasHeight * 0.85;
        
        // Calculate center position
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Calculate positions for each box
        const marginLeft = centerX - boxWidth / 2;
        const marginTop = centerY - boxHeight / 2;
        
        // Draw margin box (outermost) - Orange
        this.ctx.fillStyle = 'rgba(255, 160, 0, 0.3)';
        this.ctx.fillRect(marginLeft, marginTop, boxWidth, boxHeight);
        
        // Calculate border box dimensions (smaller than margin box)
        const borderWidth = boxWidth * 0.8;
        const borderHeight = boxHeight * 0.8;
        const borderLeft = centerX - borderWidth / 2;
        const borderTop = centerY - borderHeight / 2;
        
        // Draw border box - Yellow
        this.ctx.fillStyle = 'rgba(255, 230, 0, 0.5)';
        this.ctx.fillRect(borderLeft, borderTop, borderWidth, borderHeight);
        
        // Calculate padding box dimensions (smaller than border box)
        const paddingWidth = borderWidth * 0.8;
        const paddingHeight = borderHeight * 0.8;
        const paddingLeft = centerX - paddingWidth / 2;
        const paddingTop = centerY - paddingHeight / 2;
        
        // Draw padding box - Green
        this.ctx.fillStyle = 'rgba(0, 180, 0, 0.4)';
        this.ctx.fillRect(paddingLeft, paddingTop, paddingWidth, paddingHeight);
        
        // Calculate content box dimensions (smaller than padding box)
        const contentWidth = paddingWidth * 0.7;
        const contentHeight = paddingHeight * 0.7;
        const contentLeft = centerX - contentWidth / 2;
        const contentTop = centerY - contentHeight / 2;
        
        // Draw content box (innermost) - Blue
        this.ctx.fillStyle = 'rgba(0, 120, 212, 0.5)';
        this.ctx.fillRect(contentLeft, contentTop, contentWidth, contentHeight);
        
        // Add size labels
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        
        // Helper function to format size values
        const formatSize = (size: number, isContent: boolean = false): string => {
            // For content box, always show the actual number even if it's zero
            return (size === 0 && !isContent) ? "-" : size.toString();
        };
        
        // Content size - always show actual numbers
        this.ctx.fillText(`${formatSize(content.width, true)} × ${formatSize(content.height, true)}`, centerX, centerY);
        
        // Padding sizes
        // Top
        this.ctx.fillText(formatSize(padding.top), centerX, (contentTop + paddingTop) / 2);
        // Right
        this.ctx.fillText(formatSize(padding.right), (contentLeft + contentWidth + paddingLeft + paddingWidth) / 2, centerY);
        // Bottom
        this.ctx.fillText(formatSize(padding.bottom), centerX, (contentTop + contentHeight + paddingTop + paddingHeight) / 2);
        // Left
        this.ctx.fillText(formatSize(padding.left), (contentLeft + paddingLeft) / 2, centerY);
        
        // Border sizes
        // Top
        this.ctx.fillText(formatSize(border.top), centerX, (paddingTop + borderTop) / 2);
        // Right
        this.ctx.fillText(formatSize(border.right), (paddingLeft + paddingWidth + borderLeft + borderWidth) / 2, centerY);
        // Bottom
        this.ctx.fillText(formatSize(border.bottom), centerX, (paddingTop + paddingHeight + borderTop + borderHeight) / 2);
        // Left
        this.ctx.fillText(formatSize(border.left), (paddingLeft + borderLeft) / 2, centerY);
        
        // Margin sizes
        // Top
        this.ctx.fillText(formatSize(margin.top), centerX, (borderTop + marginTop) / 2);
        // Right
        this.ctx.fillText(formatSize(margin.right), (borderLeft + borderWidth + marginLeft + boxWidth) / 2, centerY);
        // Bottom
        this.ctx.fillText(formatSize(margin.bottom), centerX, (borderTop + borderHeight + marginTop + boxHeight) / 2);
        // Left
        this.ctx.fillText(formatSize(margin.left), (borderLeft + marginLeft) / 2, centerY);
    }
    
    private drawGrid(): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= width; x += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= height; y += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
}
