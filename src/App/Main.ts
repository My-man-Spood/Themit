import { BrowserWindow, ipcMain } from 'electron';
import { FSObject } from '../lib/FSObject';
import * as path from 'path';
import * as fs from 'fs';

export default class Main {
    static mainWindow: Electron.BrowserWindow;
    static application: Electron.App;
    static BrowserWindow;
    static projectDir = '../../.project';

    static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
        // we pass the Electron.App object and the
        // Electron.BrowserWindow into this function
        // so this class has no dependencies. This
        // makes the code easier to write tests for
        Main.BrowserWindow = browserWindow;
        Main.application = app;
        Main.application.on('window-all-closed', Main.onWindowAllClosed);
        Main.application.on('ready', Main.onReady);
    }

    private static onWindowAllClosed() {
        if (process.platform !== 'darwin') {
            Main.application.quit();
        }
    }

    private static onClose() {
        // Dereference the window object.
        Main.mainWindow = null;
    }

    private static onReady() {
        ipcMain.handle('loadDocument', (event, path) => {
            return Main.ReadFile(path);
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

    private static ReadFile(filepath: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            var fullpath = path.join(__dirname, Main.projectDir, filepath);
            console.log(fullpath);

            fs.readFile(path.join(__dirname, Main.projectDir, filepath), 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    private static readDirectoryRecursive(dir: string): Promise<FSObject[]> {
        return new Promise<FSObject[]>((resolve, reject) => {
            fs.readdir(dir, { withFileTypes: true }, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    Promise.all(
                        files.map((f) => {
                            if (f.isDirectory()) {
                                return Main.readDirectoryRecursive(path.join(dir, f.name)).then((children) => {
                                    return new FSObject(f.name, path.join(dir, f.name), true, children);
                                });
                            } else {
                                return Promise.resolve(new FSObject(f.name, path.join(dir, f.name), false, []));
                            }
                        })
                    ).then((children) => {
                        resolve(children);
                    });
                }
            });
        });
    }

    private static readDirectory(dir: string): Promise<FSObject[]> {
        return new Promise<FSObject[]>((resolve, reject) => {
            fs.readdir(dir, { withFileTypes: true }, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    Promise.all(
                        files.map((f) => {
                            return Promise.resolve(new FSObject(f.name, path.join(dir, f.name), f.isDirectory(), []));
                        })
                    ).then((children) => {
                        resolve(children);
                    });
                }
            });
        });
    }
}
