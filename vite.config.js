import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {readFileSync,existsSync} from 'node:fs';

export default defineConfig({
  plugins: [react(),{
    name:'studio-local-images',
    resolveId(id){if(id==='virtual:studio-images')return '\0studio-images';},
    load(id){if(id==='\0studio-images')return `export default ${existsSync('.generated/media.json')?readFileSync('.generated/media.json','utf8'):'{}'}`;},
  }],
  build:{rollupOptions:{output:{manualChunks(id){
    if(id.includes('node_modules')&&id.includes('@supabase'))return 'supabase';
    if(id.includes('node_modules')&&/[/\\](react|react-dom|react-router|react-router-dom|scheduler)[/\\]/.test(id))return 'react';
  }}}},
});
