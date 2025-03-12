import * as parse5 from 'parse5';
import * as postcss from 'postcss';

/**
 * Interface for HTML AST data
 */
export interface HTMLASTData {
    /** The parsed HTML AST */
    ast: any; // Using any for parse5 document as the type isn't directly exposed
    /** The original HTML content */
    content: string;
    /** The file path this AST was parsed from */
    filePath: string;
    /** Optional map for quick node lookups */
    nodeMap?: Map<string, any>;
}

/**
 * Interface for CSS AST data
 */
export interface CSSASTData {
    /** The parsed CSS AST */
    ast: postcss.Root;
    /** The original CSS content */
    content: string;
    /** The file path this AST was parsed from */
    filePath: string;
}

/**
 * Interface for HTML node hierarchy item
 */
export interface HTMLNodeHierarchy {
    /** Unique ID for the node */
    id: string;
    /** HTML tag name */
    tagName: string;
    /** Parent node ID */
    parentId: string | null;
    /** Depth in the hierarchy */
    depth: number;
    /** Node attributes */
    attributes: Record<string, string>;
    /** Source code location */
    sourceLocation?: any;
}
