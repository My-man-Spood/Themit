import * as fs from 'fs';
import * as path from 'path';
import * as parse5 from 'parse5';
import { HTMLASTData, HTMLNodeHierarchy } from './interfaces';

/**
 * HTMLParser - Responsible for parsing HTML files into ASTs and manipulating them
 */
export class HTMLParser {
    /**
     * Parse an HTML file into an AST with source location information
     * @param filePath Path to the HTML file
     * @returns Parsed AST with source location info
     */
    async parseFile(filePath: string): Promise<HTMLASTData> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            return this.parseContent(content, filePath);
        } catch (error) {
            console.error(`Error parsing HTML file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Parse HTML content into an AST with source location information
     * @param content HTML content as string
     * @param filePath Optional origin file path for reference
     * @returns Parsed AST with source location info
     */
    parseContent(content: string, filePath: string = ''): HTMLASTData {
        try {
            // Parse the HTML and retain location info
            const ast = parse5.parse(content, {
                sourceCodeLocationInfo: true
            });
            
            return {
                ast,
                content,
                filePath
            };
        } catch (error) {
            console.error('Error parsing HTML content:', error);
            throw error;
        }
    }

    /**
     * Serialize an AST back to HTML
     * @param ast The AST to serialize
     * @returns HTML string
     */
    serialize(ast: any): string {
        return parse5.serialize(ast);
    }

    /**
     * Find a node in the AST by ID
     * @param ast The AST to search
     * @param nodeId The ID to look for
     * @returns The found node or null
     */
    findNodeById(ast: any, nodeId: string): any {
        let foundNode = null;
        
        const visit = (node: any) => {
            // Check if this node has an id attribute that matches
            if (node.attrs && Array.isArray(node.attrs)) {
                const idAttr = node.attrs.find((attr: any) => 
                    attr.name === 'id' && attr.value === nodeId
                );
                
                if (idAttr) {
                    foundNode = node;
                    return true;
                }
            }
            
            // Check children
            if (node.childNodes && Array.isArray(node.childNodes)) {
                for (const child of node.childNodes) {
                    if (visit(child)) {
                        return true;
                    }
                }
            }
            
            return false;
        };
        
        visit(ast);
        return foundNode;
    }

    /**
     * Update an attribute on a node
     * @param node The node to update
     * @param attrName Attribute name
     * @param attrValue Attribute value
     */
    updateAttribute(node: any, attrName: string, attrValue: string): void {
        if (!node.attrs) {
            node.attrs = [];
        }
        
        // Find existing attribute
        const existingAttr = node.attrs.find((attr: any) => attr.name === attrName);
        
        if (existingAttr) {
            existingAttr.value = attrValue;
        } else {
            node.attrs.push({
                name: attrName,
                value: attrValue
            });
        }
    }

    /**
     * Create a flat map of all nodes with their location information
     * This helps with mapping DOM nodes to AST nodes
     * @param ast The AST to process
     * @returns Map of node IDs to AST nodes
     */
    createNodeMap(ast: any): Map<string, any> {
        const nodeMap = new Map<string, any>();
        
        const processNode = (node: any, parentPath: string = '') => {
            // Generate a unique identifier for this node
            const nodeId = this.getNodeIdentifier(node);
            const nodePath = parentPath ? `${parentPath}/${nodeId}` : nodeId;
            
            // Store in map
            nodeMap.set(nodePath, node);
            
            // Process children
            if (node.childNodes && Array.isArray(node.childNodes)) {
                node.childNodes.forEach((child: any, index: number) => {
                    processNode(child, nodePath);
                });
            }
        };
        
        processNode(ast);
        return nodeMap;
    }
    
    /**
     * Get a unique identifier for a node
     * @param node The node to identify
     * @returns A unique identifier string
     */
    private getNodeIdentifier(node: any): string {
        // Try to use existing ID
        if (node.attrs && Array.isArray(node.attrs)) {
            const idAttr = node.attrs.find((attr: any) => attr.name === 'id');
            if (idAttr) {
                return idAttr.value;
            }
        }
        
        // Use tag name + position as fallback
        const tagName = node.tagName || node.nodeName || 'node';
        return `${tagName}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Write the updated HTML back to a file
     * @param ast The AST to serialize
     * @param filePath The file to write to
     */
    async writeToFile(ast: any, filePath: string): Promise<void> {
        const content = this.serialize(ast);
        await fs.promises.writeFile(filePath, content, 'utf8');
    }
}
