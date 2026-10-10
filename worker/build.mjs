import { readFile, writeFile } from 'node:fs/promises';
import { Script, createContext } from 'node:vm';
const context = createContext({ window: {} });
new Script(await readFile(new URL('../academic-services-data.js', import.meta.url), 'utf8')).runInContext(context);
await writeFile(new URL('./generated.mjs', import.meta.url),
  `import { createWorker } from './index.mjs';\nexport default createWorker(${JSON.stringify(context.window.AcademicServicesCatalog)});\n`);
