import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const generatedFile = resolve('packages/contracts/generated/index.d.ts');
const expected = `// Generated placeholder. Replace with Swagger-based codegen in CI.\n\nexport interface ApiEnvelope<T> {\n  data: T;\n  statusCode: number;\n  timestamp: string;\n  message?: string;\n}\n`;
const actual = await readFile(generatedFile, 'utf8');

if (actual !== expected) {
  process.stderr.write(
    'Generated contracts are out of date. Run `npm run contracts:generate` and commit the result.\n',
  );
  process.exit(1);
}

process.stdout.write('Generated contracts are up to date.\n');
