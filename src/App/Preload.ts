import { contextBridge, ipcRenderer } from 'electron';
import { FSObject } from '../lib/FSObject';
import { THProject } from '../lib/THProject';

contextBridge.exposeInMainWorld('electron', {
    loadProject: (): Promise<THProject> => ipcRenderer.invoke('loadProject'),
    loadDocument: (path: string): Promise<string> => ipcRenderer.invoke('loadDocument', path),
    readDirectory: (path: string): Promise<FSObject[]> => ipcRenderer.invoke('readDirectory', path),
    buildProject: (): Promise<void> => ipcRenderer.invoke('buildProject'),
});
