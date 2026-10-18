// R3-files FT-18: the Files tree's multi-selection store and its range / select-all operations are the 2.42304.0 originals
// (c856385e2 $e/et/tt, old 2.31226.0 Re/ze/Be with the same logic) on the original zustand vanilla store (vendor-all-0 v),
// no longer a host store factory. The store notifies (state, previous) like zustand; useSyncExternalStore ignores both.
import {createFileSelectionStore,selectFileRange,selectAllFiles} from './generated/files-changes/file-selection.mjs';
export {selectFileRange,selectAllFiles};
export function createFileTreeSelection(){
 return createFileSelectionStore();
}
