import { extractFilesChanges } from './extract-files-changes.mjs';
import { referenceVersion as v4 } from './official-4.16336.0.mjs';
// Both source contracts: 3.6556.2 -> src/generated/files-changes (production, unchanged), 4.16336.0 ->
// src/generated/files-changes-v4 (isolated staging graph over cds-core, region batch 3).
await extractFilesChanges({ check: true });
await extractFilesChanges({ check: true, version: v4 });
