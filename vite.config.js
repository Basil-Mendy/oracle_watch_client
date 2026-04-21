import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true, // Allows access on your local network
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
        assetsDir: 'assets', // Keeps your JS/CSS organized
    },
    esbuild: {
        loader: 'jsx',
        include: /src\/.*\.jsx?$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
                '.jsx': 'jsx',
            },
        },
    },
    define: {
        // Safe way to pass environment variables to libraries that expect process.env
        'process.env': {}, 
    },
});