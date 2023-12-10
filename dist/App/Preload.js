"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    loadProject: () => electron_1.ipcRenderer.invoke('loadProject'),
    loadDocument: (path) => electron_1.ipcRenderer.invoke('loadDocument', path),
    readDirectory: (path) => electron_1.ipcRenderer.invoke('readDirectory', path),
});
//# sourceMappingURL=Preload.js.map