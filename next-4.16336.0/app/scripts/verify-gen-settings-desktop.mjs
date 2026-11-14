// prepare-ui discovers this verifier: the settings-desktop-v4 graph (4.16336.0, sharedGraph cds-core, linked settings-nav)
// must equal its generator's output byte for byte (scripts/extract-settings-desktop-v4.mjs --check; pins
// scripts/settings-desktop-v4-pins.json).
import { extractSettingsDesktop } from './extract-settings-desktop-v4.mjs';
await extractSettingsDesktop({ check: true });
