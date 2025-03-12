import * as fs from 'fs';
import * as path from 'path';
import { HTMLParser } from './HTMLParser';
import { CSSParser } from './CSSParser';
import { HTMLASTData, CSSASTData, HTMLNodeHierarchy } from './interfaces';

/**
 * ASTManager - Coordinates HTML and CSS parsing/manipulation in the main process
 */
export class ASTManager {
    private htmlParser: HTMLParser;
    private cssParser: CSSParser;
    
    // Maps to store loaded ASTs and their metadata
    private htmlASTs = new Map<string, HTMLASTData>();
    private cssASTs = new Map<string, CSSASTData>();
    
    constructor() {
        this.htmlParser = new HTMLParser();
        this.cssParser = new CSSParser();
    }
    
    /**
     * Parse an HTML file and store its AST
     * @param filePath Path to the HTML file
     * @returns ID to reference this AST
     */
    async parseHTMLFile(filePath: string): Promise<string> {
        try {
            const result = await this.htmlParser.parseFile(filePath);
            
            // Generate ID for this AST
            const id = this.generateId('html');
            
            // Create a node map for quick lookups
            const nodeMap = this.htmlParser.createNodeMap(result.ast);
            
            // Store the AST and metadata
            this.htmlASTs.set(id, {
                ast: result.ast,
                content: result.content,
                filePath: filePath,
                nodeMap
            });
            
            return id;
        } catch (error) {
            console.error('Error parsing HTML file:', error);
            throw error;
        }
    }
    
    /**
     * Parse a CSS file and store its AST
     * @param filePath Path to the CSS file
     * @returns ID to reference this AST
     */
    async parseCSSFile(filePath: string): Promise<string> {
        try {
            const result = await this.cssParser.parseFile(filePath);
            
            // Generate ID for this AST
            const id = this.generateId('css');
            
            // Store the AST and metadata
            this.cssASTs.set(id, {
                ast: result.ast,
                content: result.content,
                filePath: filePath
            });
            
            return id;
        } catch (error) {
            console.error('Error parsing CSS file:', error);
            throw error;
        }
    }
    
    /**
     * Get HTML node information for building a hierarchy
     * @param astId ID of the HTML AST
     * @returns Array of nodes with their hierarchy information
     */
    getHTMLHierarchy(astId: string): HTMLNodeHierarchy[] {
        const astData = this.htmlASTs.get(astId);
        if (!astData) {
            throw new Error(`HTML AST with ID ${astId} not found`);
        }
        
        const hierarchy: HTMLNodeHierarchy[] = [];
        
        const processNode = (node: any, parentId: string | null = null, depth: number = 0) => {
            // Skip non-element nodes for hierarchy view (text, comments, etc.)
            if (node.nodeName === '#text' || node.nodeName === '#comment') {
                return;
            }
            
            // Generate a node ID if needed
            const nodeId = this.getNodeId(node);
            
            // Get attributes
            const attributes: Record<string, string> = {};
            if (node.attrs && Array.isArray(node.attrs)) {
                for (const attr of node.attrs) {
                    attributes[attr.name] = attr.value;
                }
            }
            
            // Create hierarchy entry
            const entry: HTMLNodeHierarchy = {
                id: nodeId,
                tagName: node.tagName || node.nodeName,
                parentId,
                depth,
                attributes,
                sourceLocation: node.sourceCodeLocation
            };
            
            hierarchy.push(entry);
            
            // Process children
            if (node.childNodes && Array.isArray(node.childNodes)) {
                for (const child of node.childNodes) {
                    processNode(child, nodeId, depth + 1);
                }
            }
        };
        
        // Start from the HTML document
        processNode(astData.ast);
        
        return hierarchy;
    }
    
    /**
     * Update an HTML node's attribute
     * @param astId ID of the HTML AST
     * @param nodeId ID of the node to update
     * @param attrName Attribute name
     * @param attrValue Attribute value
     * @returns Success status
     */
    updateHTMLAttribute(astId: string, nodeId: string, attrName: string, attrValue: string): boolean {
        const astData = this.htmlASTs.get(astId);
        if (!astData) {
            return false;
        }
        
        // Find the node
        const node = this.htmlParser.findNodeById(astData.ast, nodeId);
        if (!node) {
            return false;
        }
        
        // Update the attribute
        this.htmlParser.updateAttribute(node, attrName, attrValue);
        return true;
    }
    
    /**
     * Update a CSS property in a rule
     * @param astId ID of the CSS AST
     * @param selector CSS selector
     * @param property CSS property
     * @param value CSS value
     * @returns Success status
     */
    updateCSSProperty(astId: string, selector: string, property: string, value: string): boolean {
        const astData = this.cssASTs.get(astId);
        if (!astData) {
            return false;
        }
        
        // Find the rule
        let rule = this.cssParser.findRuleBySelector(astData.ast, selector);
        
        // Create rule if it doesn't exist
        if (!rule) {
            rule = this.cssParser.addRule(astData.ast, selector, {});
        }
        
        // Update the property
        this.cssParser.updateProperty(rule, property, value);
        return true;
    }
    
    /**
     * Save an HTML AST back to its file
     * @param astId ID of the HTML AST
     * @returns Success status
     */
    async saveHTMLFile(astId: string): Promise<boolean> {
        const astData = this.htmlASTs.get(astId);
        if (!astData) {
            return false;
        }
        
        try {
            await this.htmlParser.writeToFile(astData.ast, astData.filePath);
            
            // Update stored content to reflect changes
            astData.content = this.htmlParser.serialize(astData.ast);
            
            return true;
        } catch (error) {
            console.error('Error saving HTML file:', error);
            return false;
        }
    }
    
    /**
     * Save a CSS AST back to its file
     * @param astId ID of the CSS AST
     * @returns Success status
     */
    async saveCSSFile(astId: string): Promise<boolean> {
        const astData = this.cssASTs.get(astId);
        if (!astData) {
            return false;
        }
        
        try {
            await this.cssParser.writeToFile(astData.ast, astData.filePath);
            
            // Update stored content to reflect changes
            astData.content = this.cssParser.serialize(astData.ast);
            
            return true;
        } catch (error) {
            console.error('Error saving CSS file:', error);
            return false;
        }
    }
    
    /**
     * Generate a unique ID
     * @param prefix Prefix for the ID
     * @returns Unique ID string
     */
    private generateId(prefix: string): string {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get a node's ID (from id attribute or generate one)
     * @param node The node to get ID for
     * @returns Node ID
     */
    private getNodeId(node: any): string {
        // Check if node has an id attribute
        if (node.attrs && Array.isArray(node.attrs)) {
            const idAttr = node.attrs.find((attr: any) => attr.name === 'id');
            if (idAttr) {
                return idAttr.value;
            }
        }
        
        // Generate a unique ID
        const tagName = node.tagName || node.nodeName || 'node';
        return `${tagName}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
