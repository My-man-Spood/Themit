// StylesheetsTab.ts
export class StylesheetsTab {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    public display(element: HTMLElement): void {
        // Clear previous info
        this.clear();
        
        // Create container for stylesheet rules
        const rulesContainer = document.createElement('div');
        rulesContainer.className = 'stylesheet-rules';
        
        // Create rules container
        const allRulesContainer = document.createElement('div');
        allRulesContainer.className = 'rules-container';
        rulesContainer.appendChild(allRulesContainer);
        
        // Add inline styles if present
        if (element.hasAttribute('style')) {
            const inlineStyleRule = document.createElement('div');
            inlineStyleRule.className = 'rule-source';
            inlineStyleRule.textContent = 'Inline Styles';
            allRulesContainer.appendChild(inlineStyleRule);
            
            const inlineRuleContainer = document.createElement('div');
            inlineRuleContainer.className = 'rule-container';
            
            const inlineDeclarations = document.createElement('div');
            inlineDeclarations.className = 'rule-declarations';
            
            const styleAttr = element.getAttribute('style') || '';
            const declarations = styleAttr.split(';').filter(decl => decl.trim() !== '');
            
            declarations.forEach(declaration => {
                const parts = declaration.split(':').map(part => part.trim());
                const name = parts[0];
                const value = parts.slice(1).join(':'); // Handle values that might contain colons
                
                if (name && value) {
                    const declarationElement = document.createElement('div');
                    declarationElement.className = 'declaration';
                    
                    const nameElement = document.createElement('span');
                    nameElement.className = 'declaration-name';
                    nameElement.textContent = name;
                    
                    const valueElement = document.createElement('span');
                    valueElement.className = 'declaration-value';
                    valueElement.textContent = value;
                    
                    declarationElement.appendChild(nameElement);
                    declarationElement.appendChild(document.createTextNode(': '));
                    declarationElement.appendChild(valueElement);
                    declarationElement.appendChild(document.createTextNode(';'));
                    
                    inlineDeclarations.appendChild(declarationElement);
                }
            });
            
            inlineRuleContainer.appendChild(inlineDeclarations);
            allRulesContainer.appendChild(inlineRuleContainer);
        }
        
        // Get all stylesheets
        try {
            // Find the viewport element that contains the rendered content
            const viewport = document.getElementById('viewport');
            if (!viewport) {
                console.warn('No viewport element found');
                return;
            }
            
            // Get the document inside the viewport (if it's an iframe) or use the main document
            const viewportDocument = viewport.ownerDocument;
            
            // Get all stylesheets from the document
            const stylesheets = Array.from(viewportDocument.styleSheets);
            
            // Group rules by their source
            const rulesBySource: { [source: string]: CSSStyleRule[] } = {};
            
            // Process each stylesheet
            stylesheets.forEach((stylesheet: CSSStyleSheet) => {
                try {
                    // Get the source of the stylesheet
                    let source = 'Unknown';
                    if (stylesheet.href) {
                        // External stylesheet
                        const url = new URL(stylesheet.href);
                        source = url.pathname.split('/').pop() || url.pathname;
                    } else if (stylesheet.ownerNode instanceof HTMLStyleElement) {
                        // Inline <style> element
                        source = 'Style Element';
                    }
                    
                    // Initialize the source if it doesn't exist
                    if (!rulesBySource[source]) {
                        rulesBySource[source] = [];
                    }
                    
                    // Get all rules from the stylesheet
                    const rules = Array.from(stylesheet.cssRules) as CSSStyleRule[];
                    
                    // Filter rules that apply to the selected element
                    rules.forEach(rule => {
                        if (rule instanceof CSSStyleRule) {
                            try {
                                if (element.matches(rule.selectorText)) {
                                    rulesBySource[source].push(rule);
                                }
                            } catch (e) {
                                console.warn(`Error matching selector: ${rule.selectorText}`, e);
                            }
                        }
                    });
                } catch (e) {
                    console.warn('Error accessing stylesheet:', e);
                }
            });
            
            // Display rules by source
            Object.entries(rulesBySource).forEach(([source, rules]) => {
                if (rules.length > 0) {
                    // Create source header
                    const sourceElement = document.createElement('div');
                    sourceElement.className = 'rule-source';
                    sourceElement.textContent = source;
                    allRulesContainer.appendChild(sourceElement);
                    
                    // Display each rule
                    rules.forEach(rule => {
                        const ruleContainer = document.createElement('div');
                        ruleContainer.className = 'rule-container';
                        
                        // Display selector
                        const selectorElement = document.createElement('div');
                        selectorElement.className = 'rule-selector';
                        selectorElement.textContent = rule.selectorText;
                        ruleContainer.appendChild(selectorElement);
                        
                        // Display declarations
                        const declarationsElement = document.createElement('div');
                        declarationsElement.className = 'rule-declarations';
                        
                        // Get all style declarations
                        const style = rule.style;
                        for (let i = 0; i < style.length; i++) {
                            const propertyName = style[i];
                            const propertyValue = style.getPropertyValue(propertyName);
                            
                            const declarationElement = document.createElement('div');
                            declarationElement.className = 'declaration';
                            
                            const nameElement = document.createElement('span');
                            nameElement.className = 'declaration-name';
                            nameElement.textContent = propertyName;
                            
                            const valueElement = document.createElement('span');
                            valueElement.className = 'declaration-value';
                            valueElement.textContent = propertyValue;
                            
                            declarationElement.appendChild(nameElement);
                            declarationElement.appendChild(document.createTextNode(': '));
                            declarationElement.appendChild(valueElement);
                            declarationElement.appendChild(document.createTextNode(';'));
                            
                            declarationsElement.appendChild(declarationElement);
                        }
                        
                        ruleContainer.appendChild(declarationsElement);
                        allRulesContainer.appendChild(ruleContainer);
                    });
                }
            });
            
            // If no rules were found, display a message
            if (Object.keys(rulesBySource).length === 0 && !element.hasAttribute('style')) {
                const noRules = document.createElement('div');
                noRules.className = 'no-rules';
                noRules.textContent = 'No CSS rules found for this element.';
                allRulesContainer.appendChild(noRules);
            }
        } catch (e: any) {
            console.error('Error displaying stylesheet rules:', e);
            
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = `Error: ${e.message}`;
            allRulesContainer.appendChild(errorElement);
        }
        
        // Add the rules container to the tab
        this.container.appendChild(rulesContainer);
    }

    public clear(): void {
        this.container.innerHTML = '';
    }
}
