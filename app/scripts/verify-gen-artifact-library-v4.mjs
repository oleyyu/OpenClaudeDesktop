// Checks the 4.16336.0 artifact library graph (scripts/extract-artifact-library-v4.mjs -> src/generated/artifact-library-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module).
import { extractArtifactLibraryV4 } from './extract-artifact-library-v4.mjs';
await extractArtifactLibraryV4({ check: true });
