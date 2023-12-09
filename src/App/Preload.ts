import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    loadDocument: (path: string) => ipcRenderer.invoke('loadDocument', path),
    loadDirectory: (path: string) => ipcRenderer.invoke('loadDirectory', path),
});
