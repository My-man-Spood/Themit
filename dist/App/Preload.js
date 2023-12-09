"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    loadDocument: (path) => electron_1.ipcRenderer.invoke('loadDocument', path),
});
//# sourceMappingURL=Preload.js.map