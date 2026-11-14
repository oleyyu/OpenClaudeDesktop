// prepare-ui discovers this verifier: the settings-account-v4 graph (4.16336.0, sharedGraph cds-core, linked settings-nav
// settings-store.mjs) must equal its generator's output byte for byte (scripts/extract-settings-account-v4.mjs --check;
// pins scripts/settings-account-v4-pins.json).
import { extractSettingsAccount } from './extract-settings-account-v4.mjs';
await extractSettingsAccount({ check: true });
