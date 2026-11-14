// prepare-ui discovers this verifier: the settings-pages-v4 graph (4.16336.0, sharedGraph cds-core, linked settings-nav)
// must equal its generator's output byte for byte (scripts/extract-settings-pages-v4.mjs --check; pins
// scripts/settings-pages-v4-pins.json).
import { extractSettingsPages } from './extract-settings-pages-v4.mjs';
await extractSettingsPages({ check: true });
