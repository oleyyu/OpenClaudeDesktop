import { inspectCoworkReference } from '../electron/cowork-runtime/reference.mjs';
const result = await inspectCoworkReference({ ...(process.argv[2] ? { root: process.argv[2] } : {}) });
console.log(JSON.stringify(result, null, 2));
if (!result.assetsAvailable) process.exitCode = 1;
