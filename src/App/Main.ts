import { BrowserWindow, ipcMain } from 'electron';
import { FSObject } from '../lib/FSObject';
import { THProject as THProject } from '../lib/THProject';
import * as Webpack from 'webpack';
import * as path from 'path';
import * as fs from 'fs';
import { WebpackBuildConfig } from './webpackbuildconf';
import { DevServer } from './DevServer';
import { ASTManager } from './AST/ASTManager';

export default class Main {
    static mainWindow: Electron.BrowserWindow;
    static application: Electron.App;
    static BrowserWindow;
    static projectDir = '../../.project';
    static projectRoot = '../../.project';
    static projectSrc = '../../.project/src';
    static devServer: DevServer | null = null;
    static astManager: ASTManager;

    static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
        // we pass the Electron.App object and the
        // Electron.BrowserWindow into this function
        // so this class has no dependencies. This
        // makes the code easier to write tests for
        Main.BrowserWindow = browserWindow;
        Main.application = app;
        Main.application.on('window-all-closed', Main.onWindowAllClosed);
        Main.application.on('ready', Main.onReady);
        
        // Register process exit handlers to ensure cleanup
        process.on('exit', () => {
            console.log('Process exit - cleaning up resources');
            if (Main.devServer) {
                Main.devServer.stop();
            }
        });
        
        // Handle CTRL+C and other termination signals
        process.on('SIGINT', () => {
            console.log('SIGINT received - cleaning up resources');
            if (Main.devServer) {
                Main.devServer.stop().finally(() => {
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        });
        
        process.on('SIGTERM', () => {
            console.log('SIGTERM received - cleaning up resources');
            if (Main.devServer) {
                Main.devServer.stop().finally(() => {
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        });
        
        // Handle Windows-specific events
        if (process.platform === 'win32') {
            process.on('message', (msg) => {
                if (msg === 'graceful-exit') {
                    console.log('Graceful exit message received - cleaning up resources');
                    if (Main.devServer) {
                        Main.devServer.stop().finally(() => {
                            process.exit(0);
                        });
                    } else {
                        process.exit(0);
                    }
                }
            });
        }
    }

    private static onWindowAllClosed() {
        if (process.platform !== 'darwin') {
            // Make sure to stop the dev server when closing the app
            if (Main.devServer) {
                Main.devServer.stop().finally(() => {
                    Main.application.quit();
                });
            } else {
                Main.application.quit();
            }
        }
    }

    private static onClose() {
        // Dereference the window object.
        Main.mainWindow = null;
    }

    private static onReady() {
        // Initialize AST Manager
        Main.astManager = new ASTManager();
        
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

        // Add new IPC handlers for the dev server
        ipcMain.handle('startDevServer', async (event, projectPath) => {
            return Main.startDevServer(projectPath || path.join(__dirname, Main.projectDir));
        });

        ipcMain.handle('stopDevServer', async () => {
            return Main.stopDevServer();
        });

        ipcMain.handle('getDevServerStatus', () => {
            return {
                running: Main.devServer?.isServerRunning() || false,
                url: Main.devServer?.getServerUrl() || ''
            };
        });
        
        // Register AST API handlers
        ipcMain.handle('ast:parseHTMLFile', async (event, filePath) => {
            // Unabstract the path (convert src:// to actual filesystem path)
            const realPath = Main.unabstractPath(filePath);
            console.log('Parsing HTML file:', filePath, '→', realPath);
            return Main.astManager.parseHTMLFile(realPath);
        });
        
        ipcMain.handle('ast:getHTMLHierarchy', (event, astId) => {
            return Main.astManager.getHTMLHierarchy(astId);
        });
        
        ipcMain.handle('ast:updateHTMLAttribute', (event, astId, nodeId, attrName, attrValue) => {
            return Main.astManager.updateHTMLAttribute(astId, nodeId, attrName, attrValue);
        });
        
        ipcMain.handle('ast:saveHTMLFile', (event, astId) => {
            return Main.astManager.saveHTMLFile(astId);
        });
        
        ipcMain.handle('ast:parseCSSFile', async (event, filePath) => {
            // Unabstract the path (convert src:// to actual filesystem path)
            const realPath = Main.unabstractPath(filePath);
            console.log('Parsing CSS file:', filePath, '→', realPath);
            return Main.astManager.parseCSSFile(realPath);
        });
        
        ipcMain.handle('ast:updateCSSProperty', (event, astId, ruleId, propName, propValue) => {
            return Main.astManager.updateCSSProperty(astId, ruleId, propName, propValue);
        });
        
        ipcMain.handle('ast:saveCSSFile', (event, astId) => {
            return Main.astManager.saveCSSFile(astId);
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

    /**
     * Start the development server for the project
     * @param projectPath Path to the project to serve
     * @returns Promise that resolves with the server URL
     */
    private static startDevServer(projectPath: string): Promise<string> {
        // If a server is already running, stop it first
        if (Main.devServer && Main.devServer.isServerRunning()) {
            return Main.devServer.stop().then(() => {
                return Main.createAndStartServer(projectPath);
            });
        }
        
        return Main.createAndStartServer(projectPath);
    }
    
    /**
     * Create and start a new dev server
     */
    private static createAndStartServer(projectPath: string): Promise<string> {
        Main.devServer = new DevServer({
            projectPath: projectPath + "/dist",
            port: 3000,
            host: 'localhost',
            debug: true // Enable debug mode to see detailed logs
        });
        
        return Main.devServer.start();
    }
    
    /**
     * Stop the development server
     */
    private static stopDevServer(): Promise<void> {
        if (Main.devServer) {
            return Main.devServer.stop();
        }
        return Promise.resolve();
    }
}
