import { extractR4eFindings } from './extract-r4e-findings.mjs';
// Production (3.6556.2, linked by code-editor, cowork-approval, session-rail and sidebar-hover-card) and the isolated
// 4.16336.0 graph (sharedGraph cds-core: re-run `node scripts/extract-r4e-findings.mjs --target 4.16336.0` after cds-core
// is regenerated).
await extractR4eFindings({ check: true });
await extractR4eFindings({ check: true, target: '4.16336.0' });
