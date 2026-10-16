import {build} from 'vite';
import {resolve} from 'node:path';
const root=process.cwd();
await build({root,build:{outDir:'/tmp/ilbi-night-dist',emptyOutDir:true,rollupOptions:{input:{app:resolve(root,'index.html'),fixtures:resolve(root,'tests/themeFixtures.html')}}}});
