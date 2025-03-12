import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import { spawn } from 'cross-spawn';

export interface DevServerOptions {
    projectPath: string;
    port?: number;
    host?: string;
    debug?: boolean;
}

export class DevServer {
    private process: childProcess.ChildProcess | null = null;
    private options: DevServerOptions;
    private serverUrl: string = '';
    private isRunning: boolean = false;
    private debug: boolean = false;

    constructor(options: DevServerOptions) {
        this.options = {
            port: 3000,
            host: 'localhost',
            debug: false,
            ...options
        };
        this.debug = !!this.options.debug;
    }

    /**
     * Start the development server
     * @returns Promise that resolves with the server URL
     */
    public start(): Promise<string> {
        if (this.isRunning) {
            return Promise.resolve(this.serverUrl);
        }

        return new Promise((resolve, reject) => {
            try {
                // First, try to kill any existing process using our port
                this.killProcessOnPort(this.options.port)
                    .then(() => {
                        // Continue with server startup
                        this.startServer(resolve, reject);
                    })
                    .catch((error) => {
                        this.log(`Warning: Failed to kill process on port ${this.options.port}:`, error);
                        // Try to start the server anyway
                        this.startServer(resolve, reject);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * The actual server startup logic
     */
    private startServer(resolve: (url: string) => void, reject: (error: Error) => void): void {
        try {
            // Check if the project directory exists
            if (!fs.existsSync(this.options.projectPath)) {
                this.log(`Project directory does not exist: ${this.options.projectPath}`);
                fs.mkdirSync(this.options.projectPath, { recursive: true });
                this.log(`Created project directory: ${this.options.projectPath}`);
            }
            
            // Check if there's an index.html file
            const indexPath = path.join(this.options.projectPath, 'index.html');
            if (!fs.existsSync(indexPath)) {
                this.log(`No index.html found at ${indexPath}, creating a basic one`);
                const basicHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Themit Project</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Themit</h1>
        <p>This is a placeholder page. Edit your project files to see changes.</p>
        <div id="app"></div>
    </div>
</body>
</html>
`;
                fs.writeFileSync(indexPath, basicHtml);
                this.log(`Created basic index.html at ${indexPath}`);
            }
            
            this.createViteConfig();
            
            this.log('Starting Vite server in directory:', this.options.projectPath);
            
            // Start Vite server
            const viteProcess = spawn('npx', ['vite', '--host', this.options.host, '--port', this.options.port.toString()], {
                cwd: this.options.projectPath,
                env: {
                    ...process.env,
                    FORCE_COLOR: 'true' // Enable colored output
                }
            });
            
            this.process = viteProcess;
            
            let output = '';
            let errorOutput = '';
            let serverStarted = false;
            
            viteProcess.stdout?.on('data', (data) => {
                const dataStr = data.toString();
                output += dataStr;
                this.log(`[Vite] ${dataStr.trim()}`);
                
                // Check if server has started and extract URL
                if (!serverStarted) {
                    // Look for multiple possible patterns that indicate server is running
                    const localPattern = /Local:\s+(http:\/\/[^\s]+)/;
                    const listeningPattern = /listening on (?:.*?)(http:\/\/[^\s]+)/i;
                    const readyPattern = /ready in \d+ms/i;
                    const serverPattern = /server running at (http:\/\/[^\s]+)/i;
                    const previewPattern = /preview server running at (http:\/\/[^\s]+)/i;
                    const portPattern = new RegExp(`${this.options.port}`, 'i');
                    
                    let matches = dataStr.match(localPattern) || 
                                 dataStr.match(listeningPattern) ||
                                 dataStr.match(serverPattern) ||
                                 dataStr.match(previewPattern);
                    
                    if (matches && matches[1]) {
                        // URL found in output
                        this.serverUrl = matches[1];
                        this.isRunning = true;
                        serverStarted = true;
                        this.log('Server started with URL:', this.serverUrl);
                        resolve(this.serverUrl);
                    } else if (dataStr.match(readyPattern) || dataStr.match(portPattern)) {
                        // "Ready in Xms" message found or port number mentioned - server is likely running
                        // Use default URL based on options
                        this.serverUrl = `http://${this.options.host}:${this.options.port}`;
                        this.isRunning = true;
                        serverStarted = true;
                        this.log('Server ready detected, using default URL:', this.serverUrl);
                        resolve(this.serverUrl);
                    }
                }
            });
            
            viteProcess.stderr?.on('data', (data) => {
                const dataStr = data.toString();
                errorOutput += dataStr;
                console.error(`[Vite Error] ${dataStr.trim()}`);
                
                // Check for port in use error
                if (dataStr.includes('EADDRINUSE') || dataStr.includes('port is already in use')) {
                    this.log(`Port ${this.options.port} is already in use. Attempting to kill the process...`);
                    this.killProcessOnPort(this.options.port)
                        .then(() => {
                            // Try starting the server again with a slight delay
                            setTimeout(() => {
                                this.log('Retrying server start after killing process on port...');
                                this.startServer(resolve, reject);
                            }, 1000);
                        })
                        .catch((error) => {
                            reject(new Error(`Port ${this.options.port} is already in use and could not be freed: ${error.message}`));
                        });
                }
            });
            
            viteProcess.on('close', (code) => {
                if (code !== 0 && !serverStarted) {
                    this.isRunning = false;
                    reject(new Error(`Vite server exited with code ${code}. Error: ${errorOutput}`));
                }
                
                this.isRunning = false;
                this.process = null;
                this.log('[Vite] Server closed');
            });
            
            // Timeout if server doesn't start within 30 seconds
            setTimeout(() => {
                if (!serverStarted) {
                    this.log('[Vite] Server startup timeout, but checking if it might be running anyway...');
                    
                    // Even if we didn't detect startup, let's check if the server might be running
                    // by assuming the default URL
                    const defaultUrl = `http://${this.options.host}:${this.options.port}`;
                    this.serverUrl = defaultUrl;
                    this.isRunning = true;
                    serverStarted = true;
                    this.log('Using default URL after timeout:', defaultUrl);
                    resolve(defaultUrl);
                }
            }, 30000);
        } catch (error) {
            reject(error);
        }
    }
    
    /**
     * Attempt to kill any process running on the specified port
     */
    private killProcessOnPort(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.log(`Attempting to kill process on port ${port}`);
            
            if (process.platform === 'win32') {
                // Windows approach
                const findCommand = spawn('netstat', ['-ano']);
                let output = '';
                
                findCommand.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                findCommand.on('close', () => {
                    // Look for the port in the output
                    const lines = output.split('\n');
                    let pid = null;
                    
                    for (const line of lines) {
                        if (line.includes(':' + port) && (line.includes('LISTENING') || line.includes('ESTABLISHED'))) {
                            // Extract the PID (last column)
                            const parts = line.trim().split(/\s+/);
                            pid = parts[parts.length - 1];
                            break;
                        }
                    }
                    
                    if (pid) {
                        this.log(`Found process with PID ${pid} using port ${port}, killing it...`);
                        const killCommand = spawn('taskkill', ['/F', '/PID', pid]);
                        
                        killCommand.on('close', (code) => {
                            if (code === 0) {
                                this.log(`Successfully killed process with PID ${pid}`);
                                // Wait a moment to ensure the port is freed
                                setTimeout(resolve, 500);
                            } else {
                                const error = new Error(`Failed to kill process with PID ${pid}, exit code: ${code}`);
                                this.log(error.message);
                                reject(error);
                            }
                        });
                    } else {
                        this.log(`No process found using port ${port}`);
                        resolve();
                    }
                });
            } else {
                // Unix-like systems approach
                const findCommand = spawn('lsof', ['-i', `:${port}`]);
                let output = '';
                
                findCommand.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                findCommand.on('close', () => {
                    // Look for the port in the output
                    const lines = output.split('\n');
                    let pid = null;
                    
                    for (let i = 1; i < lines.length; i++) { // Skip header line
                        const line = lines[i].trim();
                        if (line) {
                            const parts = line.split(/\s+/);
                            pid = parts[1];
                            break;
                        }
                    }
                    
                    if (pid) {
                        this.log(`Found process with PID ${pid} using port ${port}, killing it...`);
                        const killCommand = spawn('kill', ['-9', pid]);
                        
                        killCommand.on('close', (code) => {
                            if (code === 0) {
                                this.log(`Successfully killed process with PID ${pid}`);
                                // Wait a moment to ensure the port is freed
                                setTimeout(resolve, 500);
                            } else {
                                const error = new Error(`Failed to kill process with PID ${pid}, exit code: ${code}`);
                                this.log(error.message);
                                reject(error);
                            }
                        });
                    } else {
                        this.log(`No process found using port ${port}`);
                        resolve();
                    }
                });
            }
        });
    }
    
    /**
     * Stop the development server
     */
    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.process || !this.isRunning) {
                this.isRunning = false;
                this.process = null;
                resolve();
                return;
            }
            
            this.log('Stopping Vite server...');
            
            // Kill process based on platform
            if (process.platform === 'win32') {
                // Windows requires taskkill to ensure child processes are killed too
                childProcess.exec(`taskkill /pid ${this.process.pid} /T /F`, (error) => {
                    if (error) {
                        this.log('Error stopping server:', error);
                    }
                    this.isRunning = false;
                    this.process = null;
                    resolve();
                });
            } else {
                // For non-Windows platforms
                this.process.kill('SIGTERM');
                this.isRunning = false;
                this.process = null;
                resolve();
            }
        });
    }
    
    /**
     * Check if the server is currently running
     */
    public isServerRunning(): boolean {
        return this.isRunning;
    }
    
    /**
     * Get the URL of the running server
     */
    public getServerUrl(): string {
        return this.serverUrl;
    }
    
    /**
     * Create a Vite configuration file in the project directory
     */
    private createViteConfig(): void {
        const configPath = path.join(this.options.projectPath, 'vite.config.js');
        
        this.log('Creating Vite config at:', configPath);
        
        // Only create config file if it doesn't exist
        if (!fs.existsSync(configPath)) {
            const configContent = `
// Generated by Themit
export default {
  root: '${this.options.projectPath.replace(/\\/g, '\\\\')}',
  server: {
    port: ${this.options.port},
    host: '${this.options.host}',
    strictPort: true,
    hmr: true,
    open: false,
    cors: true,
    fs: {
      // Allow serving files from project root
      allow: ['..']
    }
  },
  preview: {
    port: ${this.options.port},
    host: '${this.options.host}',
    strictPort: true
  }
}
`;
            fs.writeFileSync(configPath, configContent);
            this.log(`Created Vite config at ${configPath}`);
        } else {
            this.log(`Vite config already exists at ${configPath}`);
        }
    }
    
    /**
     * Log a message if debug mode is enabled
     */
    private log(...args: any[]): void {
        if (this.debug) {
            console.log('[DevServer]', ...args);
        }
    }
}
