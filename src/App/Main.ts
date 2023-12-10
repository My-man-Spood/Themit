import { BrowserWindow, ipcMain } from 'electron';
import { FSObject } from '../lib/FSObject';
import { THProject as THProject } from '../lib/THProject';
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

        ipcMain.handle('readDirectory', (event, path) => {
            return Main.readDirectory(path);
        });

        ipcMain.handle('loadProject', (event) => {
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

    private static ReadFile(filepath: string): Promise<string> {
        filepath = Main.unabstractPath(filepath);

        return new Promise<string>((resolve, reject) => {
            var fullpath = path.join(__dirname, Main.projectDir, filepath);
            console.log(fullpath);

            fs.readFile(filepath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    private static readDirectory(dir: string, rewritePath: boolean = true): Promise<FSObject[]> {
        const fullPath = dir.replace('res://', path.join(__dirname, Main.projectDir));
        const abstractPath = dir.replace(path.join(__dirname, Main.projectDir), 'res://');

        console.log(path.join(abstractPath, 'swag'));
        return new Promise<FSObject[]>((resolve, reject) => {
            fs.readdir(fullPath, { withFileTypes: true }, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    Promise.all(
                        files.map((f) => {
                            var filepath = path.join(fullPath, f.name);

                            return Promise.resolve(
                                new FSObject(
                                    f.name,
                                    rewritePath ? Main.abstractPath(filepath) : filepath,
                                    f.isDirectory(),
                                    []
                                )
                            );
                        })
                    ).then((children) => {
                        resolve(children);
                    });
                }
            });
        });
    }

    private static abstractPath(filepath: string): string {
        return filepath.replace(path.join(__dirname, Main.projectDir) + '\\', 'res://');
    }

    private static unabstractPath(filepath: string): string {
        return filepath.replace('res://', path.join(__dirname, Main.projectDir) + '\\');
    }

    private static loadProject(): Promise<THProject> {
        return new Promise<THProject>((resolve, reject) => {
            fs.readFile(path.join(__dirname, Main.projectDir, 'thproject.json'), 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    //TODO: Parse project settings quand yaura des settings
                    const proj = new THProject();
                    proj.rootDir = path.join(__dirname, Main.projectDir);

                    resolve(proj);
                }
            });
        });
    }
}
