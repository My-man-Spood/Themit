import { contextBridge, ipcRenderer } from 'electron';
import { FSObject } from '../lib/FSObject';
import { THProject } from '../lib/THProject';

contextBridge.exposeInMainWorld('electron', {
    loadProject: (): Promise<THProject> => ipcRenderer.invoke('loadProject'),
    loadDocument: (path: string): Promise<string> => ipcRenderer.invoke('loadDocument', path),
    readDirectory: (path: string): Promise<FSObject[]> => ipcRenderer.invoke('readDirectory', path),
    buildProject: (): Promise<void> => ipcRenderer.invoke('buildProject'),
    
    // Dev server methods
    startDevServer: (projectPath?: string): Promise<string> => 
        ipcRenderer.invoke('startDevServer', projectPath),
    stopDevServer: (): Promise<void> => 
        ipcRenderer.invoke('stopDevServer'),
    getDevServerStatus: (): Promise<{running: boolean, url: string}> => 
        ipcRenderer.invoke('getDevServerStatus'),
        
    // AST API for HTML and CSS manipulation
    ast: {
        // HTML Methods
        parseHTMLFile: (filePath: string): Promise<string> => 
            ipcRenderer.invoke('ast:parseHTMLFile', filePath),
        getHTMLHierarchy: (astId: string): Promise<any[]> => 
            ipcRenderer.invoke('ast:getHTMLHierarchy', astId),
        updateHTMLAttribute: (astId: string, nodeId: string, attrName: string, attrValue: string): Promise<boolean> => 
            ipcRenderer.invoke('ast:updateHTMLAttribute', astId, nodeId, attrName, attrValue),
        saveHTMLFile: (astId: string): Promise<boolean> => 
            ipcRenderer.invoke('ast:saveHTMLFile', astId),
            
        // CSS Methods
        parseCSSFile: (filePath: string): Promise<string> => 
            ipcRenderer.invoke('ast:parseCSSFile', filePath),
        updateCSSProperty: (astId: string, selector: string, property: string, value: string): Promise<boolean> => 
            ipcRenderer.invoke('ast:updateCSSProperty', astId, selector, property, value),
        saveCSSFile: (astId: string): Promise<boolean> => 
            ipcRenderer.invoke('ast:saveCSSFile', astId)
    }
});
