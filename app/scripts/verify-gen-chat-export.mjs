// Checks both chat export graphs (scripts/extract-chat-export.mjs):
//   3.6556.2  src/generated/chat-export (production, the host's import): byte check, always strict.
//   4.16336.0 src/generated/chat-export-v4 (isolated): byte check, strict, when the folder exists. While it does not, the
//             default run (the one prepare:ui spawns) only reports the 4.16336.0 contract's status (a dry-run) and never
//             fails on it: the production graph is 3.6556.2, so a staging stop (D46 cds-core module state without a
//             publicName, the engine's unbound-global check until engine-extra-globals.patch is merged, or a contract
//             that now generates and is waiting to be written) must not fail the production build.
//             --release=4.16336.0 checks the 4.16336.0 graph alone and strictly (fails while blocked or missing);
//             tests/chat-export-v4.test.mjs pins the blocked state and the cds-core graph it was surveyed against, so it
//             turns red when cds-core changes and the contract has to be run again.
import fs from 'node:fs';
import path from 'node:path';
import { extractChatExport, extractChatExportV4, CHAT_EXPORT_V4_OUTPUT } from './extract-chat-export.mjs';

const only = process.argv.find(arg => arg.startsWith('--release='))?.slice('--release='.length);
if (only && !['3.6556.2', '4.16336.0'].includes(only)) throw Error(`unknown release ${only}`);
if (only !== '4.16336.0') await extractChatExport({ check: true });
if (only !== '3.6556.2') {
  const staged = fs.existsSync(path.join(import.meta.dirname, '..', CHAT_EXPORT_V4_OUTPUT));
  if (staged || only === '4.16336.0') await extractChatExportV4({ check: true });
  else {
    let status;
    try {
      await extractChatExportV4({ dryRun: true });
      status = `GENERATES, not staged: run node scripts/extract-chat-export.mjs --release=4.16336.0 (${CHAT_EXPORT_V4_OUTPUT} is missing)`;
    } catch (error) {
      status = /^module state cds-core holds without a semantic name/.test(error.message)
        ? `BLOCKED (D46), nothing generated. ${error.message}`
        : `BLOCKED, nothing generated (not D46; strict: --release=4.16336.0). ${error.message}`;
    }
    console.log(`chat export 4.16336.0 (staging, not production): ${status}`);
  }
}
