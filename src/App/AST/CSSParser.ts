import * as fs from 'fs';
import * as path from 'path';
import * as postcss from 'postcss';
import { CSSASTData } from './interfaces';

/**
 * CSSParser - Responsible for parsing CSS files into ASTs and manipulating them
 */
export class CSSParser {
    /**
     * Parse a CSS file into an AST
     * @param filePath Path to the CSS file
     * @returns Parsed CSS AST
     */
    async parseFile(filePath: string): Promise<CSSASTData> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            return this.parseContent(content, filePath);
        } catch (error) {
            console.error(`Error parsing CSS file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Parse CSS content into an AST
     * @param content CSS content as string
     * @param filePath Optional origin file path for reference
     * @returns Parsed CSS AST
     */
    parseContent(content: string, filePath: string = ''): CSSASTData {
        try {
            // Parse the CSS
            const ast = postcss.parse(content, {
                from: filePath
            });
            
            return {
                ast,
                content,
                filePath
            };
        } catch (error) {
            console.error('Error parsing CSS content:', error);
            throw error;
        }
    }

    /**
     * Serialize a CSS AST back to string
     * @param ast The CSS AST to serialize
     * @returns CSS string
     */
    serialize(ast: postcss.Root): string {
        return ast.toString();
    }

    /**
     * Find a rule in the CSS AST by selector
     * @param ast The CSS AST to search
     * @param selector The CSS selector to look for
     * @returns The found rule or undefined
     */
    findRuleBySelector(ast: postcss.Root, selector: string): postcss.Rule | undefined {
        let foundRule: postcss.Rule | undefined;
        
        ast.walkRules(selector, (rule) => {
            foundRule = rule;
            return false; // Stop walking
        });
        
        return foundRule;
    }

    /**
     * Find a declaration in a rule by property
     * @param rule The CSS rule to search
     * @param property The CSS property to look for
     * @returns The found declaration or undefined
     */
    findDeclaration(rule: postcss.Rule, property: string): postcss.Declaration | undefined {
        let foundDecl: postcss.Declaration | undefined;
        
        rule.walkDecls(property, (decl) => {
            foundDecl = decl;
            return false; // Stop walking
        });
        
        return foundDecl;
    }

    /**
     * Update or add a CSS property in a rule
     * @param rule The rule to update
     * @param property The CSS property name
     * @param value The CSS property value
     */
    updateProperty(rule: postcss.Rule, property: string, value: string): void {
        const existing = this.findDeclaration(rule, property);
        
        if (existing) {
            existing.value = value;
        } else {
            rule.append({ prop: property, value });
        }
    }

    /**
     * Add a new rule to the CSS AST
     * @param ast The CSS AST to modify
     * @param selector The CSS selector for the new rule
     * @param declarations Object containing property-value pairs
     * @returns The created rule
     */
    addRule(ast: postcss.Root, selector: string, declarations: Record<string, string>): postcss.Rule {
        const rule = postcss.rule({ selector });
        
        for (const [property, value] of Object.entries(declarations)) {
            rule.append(postcss.decl({ prop: property, value }));
        }
        
        ast.append(rule);
        return rule;
    }

    /**
     * Create a map of all selectors to their rules
     * @param ast The CSS AST to process
     * @returns Map of selectors to rules
     */
    createSelectorMap(ast: postcss.Root): Map<string, postcss.Rule> {
        const selectorMap = new Map<string, postcss.Rule>();
        
        ast.walkRules((rule) => {
            selectorMap.set(rule.selector, rule);
        });
        
        return selectorMap;
    }
    
    /**
     * Write the updated CSS back to a file
     * @param ast The CSS AST to serialize
     * @param filePath The file to write to
     */
    async writeToFile(ast: postcss.Root, filePath: string): Promise<void> {
        const content = this.serialize(ast);
        await fs.promises.writeFile(filePath, content, 'utf8');
    }
}
