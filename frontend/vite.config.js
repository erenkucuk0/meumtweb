var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { getPort } from 'get-port-please';
export default defineConfig(function () { return __awaiter(void 0, void 0, void 0, function () {
    var frontendPort, backendPort;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getPort({ port: 3002, portRange: [3000, 3999] })];
            case 1:
                frontendPort = _a.sent();
                return [4 /*yield*/, getPort({ port: 5002, portRange: [5000, 5999] })];
            case 2:
                backendPort = _a.sent();
                return [2 /*return*/, {
                        plugins: [react()],
                        // Context7 pattern: Enhanced server configuration
                        server: {
                            port: frontendPort,
                            strictPort: false,
                            host: true,
                            proxy: {
                                '/api': {
                                    target: "http://localhost:".concat(backendPort),
                                    changeOrigin: true,
                                    secure: false,
                                    ws: true,
                                    configure: function (proxy, _options) {
                                        proxy.on('error', function (err, _req, _res) {
                                            console.log('Proxy error:', err);
                                        });
                                        proxy.on('proxyReq', function (proxyReq, req, _res) {
                                            console.log('Sending Request:', req.method, req.url);
                                        });
                                        proxy.on('proxyRes', function (proxyRes, req, _res) {
                                            console.log('Received Response:', proxyRes.statusCode, req.url);
                                        });
                                    }
                                },
                                '/uploads': {
                                    target: "http://localhost:".concat(backendPort),
                                    changeOrigin: true,
                                    secure: false
                                }
                            },
                            watch: {
                                usePolling: true,
                                interval: 1000
                            },
                            hmr: {
                                protocol: 'ws',
                                host: 'localhost',
                                port: frontendPort
                            }
                        },
                        // Context7 pattern: Enhanced build configuration
                        build: {
                            outDir: 'dist',
                            sourcemap: true,
                            manifest: true,
                            rollupOptions: {
                                output: {
                                    manualChunks: {
                                        vendor: ['react', 'react-dom', 'react-router-dom'],
                                        utils: ['axios', 'lodash']
                                    }
                                }
                            },
                            chunkSizeWarningLimit: 1000
                        },
                        // Context7 pattern: Enhanced resolve configuration
                        resolve: {
                            alias: {
                                '@': path.resolve(__dirname, './src'),
                                '@components': path.resolve(__dirname, './src/components'),
                                '@pages': path.resolve(__dirname, './src/pages'),
                                '@services': path.resolve(__dirname, './src/services'),
                                '@utils': path.resolve(__dirname, './src/utils'),
                                '@assets': path.resolve(__dirname, './src/assets'),
                                '@styles': path.resolve(__dirname, './src/styles')
                            }
                        },
                        // Context7 pattern: Enhanced optimization configuration
                        optimizeDeps: {
                            include: ['react', 'react-dom', 'react-router-dom', 'axios'],
                            exclude: ['@testing-library/jest-dom']
                        },
                        // Context7 pattern: Enhanced preview configuration
                        preview: {
                            port: frontendPort,
                            strictPort: false,
                            host: true
                        },
                        // Context7 pattern: Enhanced test configuration
                        test: {
                            globals: true,
                            environment: 'jsdom',
                            setupFiles: './src/test/setup.ts',
                            coverage: {
                                reporter: ['text', 'json', 'html'],
                                exclude: [
                                    'node_modules/',
                                    'src/test/',
                                    '**/*.d.ts',
                                ]
                            }
                        }
                    }];
        }
    });
}); });
