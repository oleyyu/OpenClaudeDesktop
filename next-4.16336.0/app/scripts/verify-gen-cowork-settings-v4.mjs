// Checks the 4.16336.0 Settings › Cowork graph (scripts/extract-cowork-settings-v4.mjs -> src/generated/cowork-settings-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module).
import { extractCoworkSettingsV4 } from './extract-cowork-settings-v4.mjs';
await extractCoworkSettingsV4({ check: true });
