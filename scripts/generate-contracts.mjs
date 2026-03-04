import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const generatedDir = resolve('packages/contracts/generated');
const generatedFile = resolve(generatedDir, 'index.d.ts');

await mkdir(generatedDir, { recursive: true });

const banner = `// Generated placeholder. Replace with Swagger-based codegen in CI.\n\n`;
const content = `${banner}export interface ApiEnvelope<T> {\n  data: T;\n  statusCode: number;\n  timestamp: string;\n  message?: string;\n}\n`;

await writeFile(generatedFile, content, 'utf8');

process.stdout.write(`Generated contracts at ${generatedFile}\n`);
