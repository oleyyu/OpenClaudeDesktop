// Both release contracts of extract-code-editor-current.mjs: the production 3.6556.2 graph (src/generated/code-editor-current)
// and the isolated 4.16336.0 graph (src/generated/code-editor-current-v4), each regenerated in memory and compared byte for byte.
import {codeEditorCurrentReleases} from './extract-code-editor-current.mjs';
for (const extract of Object.values(codeEditorCurrentReleases)) await extract({check:true});
