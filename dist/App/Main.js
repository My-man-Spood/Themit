"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const FSObject_1 = require("../lib/FSObject");
const THProject_1 = require("../lib/THProject");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class Main {
    static main(app, browserWindow) {
        // we pass the Electron.App object and the
        // Electron.BrowserWindow into this function
        // so this class has no dependencies. This
        // makes the code easier to write tests for
        Main.BrowserWindow = browserWindow;
        Main.application = app;
        Main.application.on('window-all-closed', Main.onWindowAllClosed);
        Main.application.on('ready', Main.onReady);
    }
    static onWindowAllClosed() {
        if (process.platform !== 'darwin') {
            Main.application.quit();
        }
    }
    static onClose() {
        // Dereference the window object.
        Main.mainWindow = null;
    }
    static onReady() {
        electron_1.ipcMain.handle('loadDocument', (event, path) => {
            return Main.ReadFile(path);
        });
        electron_1.ipcMain.handle('readDirectory', (event, path) => {
            return Main.readDirectory(path);
        });
        electron_1.ipcMain.handle('loadProject', (event) => {
            return Main.loadProject();
        });
        Main.mainWindow = new Main.BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
            },
        });
        Main.mainWindow.on('closed', Main.onClose);
        var appDatapath = Main.application.getPath('appData') + '/themit';
        Main.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
    static ReadFile(filepath) {
        filepath = Main.unabstractPath(filepath);
        return new Promise((resolve, reject) => {
            var fullpath = path.join(__dirname, Main.projectDir, filepath);
            console.log(fullpath);
            fs.readFile(filepath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    static readDirectory(dir, rewritePath = true) {
        const fullPath = dir.replace('res://', path.join(__dirname, Main.projectDir));
        const abstractPath = dir.replace(path.join(__dirname, Main.projectDir), 'res://');
        console.log(path.join(abstractPath, 'swag'));
        return new Promise((resolve, reject) => {
            fs.readdir(fullPath, { withFileTypes: true }, (err, files) => {
                if (err) {
                    reject(err);
                }
                else {
                    Promise.all(files.map((f) => {
                        var filepath = path.join(fullPath, f.name);
                        return Promise.resolve(new FSObject_1.FSObject(f.name, rewritePath ? Main.abstractPath(filepath) : filepath, f.isDirectory(), []));
                    })).then((children) => {
                        resolve(children);
                    });
                }
            });
        });
    }
    static abstractPath(filepath) {
        return filepath.replace(path.join(__dirname, Main.projectDir) + '\\', 'res://');
    }
    static unabstractPath(filepath) {
        return filepath.replace('res://', path.join(__dirname, Main.projectDir) + '\\');
    }
    static loadProject() {
        return new Promise((resolve, reject) => {
            fs.readFile(path.join(__dirname, Main.projectDir, 'thproject.json'), 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    //TODO: Parse project settings quand yaura des settings
                    const proj = new THProject_1.THProject();
                    proj.rootDir = path.join(__dirname, Main.projectDir);
                    resolve(proj);
                }
            });
        });
    }
}
Main.projectDir = '../../.project';
exports.default = Main;
//# sourceMappingURL=Main.js.map