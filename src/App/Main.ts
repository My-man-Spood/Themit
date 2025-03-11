import { BrowserWindow, ipcMain } from 'electron';
import { FSObject } from '../lib/FSObject';
import { THProject as THProject } from '../lib/THProject';
import * as Webpack from 'webpack';
import * as path from 'path';
import * as fs from 'fs';
import { WebpackBuildConfig } from './webpackbuildconf';

export default class Main {
    static mainWindow: Electron.BrowserWindow;
    static application: Electron.App;
    static BrowserWindow;
    static projectDir = '../../.project';
    static projectRoot = '../../.project';
    static projectSrc = '../../.project/src';

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

        ipcMain.handle('buildProject', (event) => {
            return Main.buildProject();
        });

        Main.mainWindow = new Main.BrowserWindow({
            frame: false,
            titleBarStyle: 'hidden',
            titleBarOverlay: {
                color: '#212121',
                symbolColor: '#cccccc',
                height: 35,
            },
            width: 1024,
            height: 768,
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
        const fullPath = Main.unabstractPath(dir);
        const abstractPath = Main.abstractPath(dir);

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
        return filepath.replace(path.join(__dirname, Main.projectSrc) + '\\', 'src://');
    }

    private static unabstractPath(filepath: string): string {
        return filepath.replace('src://', path.join(__dirname, Main.projectSrc) + '\\');
    }

    private static loadProject(): Promise<THProject> {
        return new Promise<THProject>((resolve, reject) => {
            fs.readFile(path.join(__dirname, Main.projectDir, 'thproject.json'), 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    //TODO: Parse project settings quand yaura des settings
                    const proj = {} as THProject;
                    proj.rootDir = path.join(__dirname, Main.projectDir);

                    resolve(proj);
                }
            });
        });
    }

    private static buildProject(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let config = WebpackBuildConfig(path.join(__dirname, Main.projectDir), 'development');
            console.log(config);
            Webpack.webpack(config, (err, stats) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    console.log('build done');
                    resolve();
                }
            });
        });
    }
}
