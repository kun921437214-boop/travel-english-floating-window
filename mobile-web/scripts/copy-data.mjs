import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = resolve(__dirname, '../../src/data/travel-english.json');
const target = resolve(__dirname, '../src/data/travel-english.json');

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`已复制数据：${target}`);
