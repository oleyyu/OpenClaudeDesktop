// prepare-ui discovers this verifier: the settings-nav graph (4.16336.0, sharedGraph cds-core) must equal its generator's
// output byte for byte (scripts/extract-settings-nav-v4.mjs --check; pins scripts/settings-nav-v4-pins.json).
import { extractSettingsNav } from './extract-settings-nav-v4.mjs';
await extractSettingsNav({ check: true });
