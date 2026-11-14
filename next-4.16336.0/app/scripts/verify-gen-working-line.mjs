import fs from 'node:fs';
import path from 'node:path';
import { extractWorkingLine } from './extract-working-line.mjs';
import { extractWorkingLineV4, WORKING_LINE_V4_OUTPUT } from './extract-working-line-v4.mjs';

// 3.6556.2 production graph (src/generated/working-line): always strict.
await extractWorkingLine({ check: true });
// 4.16336.0 isolated graph (src/generated/working-line-v4, scripts/extract-working-line-v4.mjs): strict whenever the staged
// folder exists; --release=4.16336.0 requires it. Without it (a fresh tree) only the dry run reports.
const staged = fs.existsSync(path.join(path.resolve(import.meta.dirname, '..'), WORKING_LINE_V4_OUTPUT, 'manifest.json'));
if (staged || process.argv.includes('--release=4.16336.0')) await extractWorkingLineV4({ check: true });
else console.log(`working line 4.16336.0: not staged (${WORKING_LINE_V4_OUTPUT} missing); run node scripts/extract-working-line-v4.mjs`);
