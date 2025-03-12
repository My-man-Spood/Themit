import { THProject } from "../lib/THProject";
import { FSObject } from "../lib/FSObject";

declare global {
    interface Window {
        electron: {
            // Project methods
            loadProject: () => Promise<THProject>;
            loadDocument: (path: string) => Promise<string>;
            readDirectory: (path: string) => Promise<FSObject[]>;
            buildProject: () => Promise<void>;
            
            // Dev server methods
            startDevServer: (projectPath?: string) => Promise<string>;
            stopDevServer: () => Promise<void>;
            getDevServerStatus: () => Promise<{running: boolean, url: string}>;
            
            // AST API for HTML and CSS manipulation
            ast: {
                // HTML Methods
                parseHTMLFile: (filePath: string) => Promise<string>;
                getHTMLHierarchy: (astId: string) => Promise<any[]>;
                updateHTMLAttribute: (astId: string, nodeId: string, attrName: string, attrValue: string) => Promise<boolean>;
                saveHTMLFile: (astId: string) => Promise<boolean>;
                
                // CSS Methods
                parseCSSFile: (filePath: string) => Promise<string>;
                updateCSSProperty: (astId: string, selector: string, property: string, value: string) => Promise<boolean>;
                saveCSSFile: (astId: string) => Promise<boolean>;
            }
        }
    }
}

export {};
