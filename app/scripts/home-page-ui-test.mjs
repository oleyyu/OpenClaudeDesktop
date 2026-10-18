// 2.37337.1 presets replaces the greeting / stats / Action Center home.
// Keep the standard harness report while the isolated fixture exercises the
// new environment card, Next steps, composer, panes, sizing and translations.
import fs from 'node:fs/promises';
import path from 'node:path';
import { report } from './code-presets-ui-test.mjs';
const evidence = path.resolve(import.meta.dirname, '../../analysis/batch-20260920');
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(path.join(evidence, 'home-page-ui-report.json'), JSON.stringify({ ...report, passed: report.passed }, null, 2));
