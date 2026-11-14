import {useRef} from 'react';
// R3-files FT-18: 2.42304.0 cccc2cf0a Ux/Wx (old Jv/Yv); Wx also reads the RTL scrollbar side (Gx over shared-25 Pf).
import {isBlankTreePress,isBlankTreeTarget} from './generated/files-changes/file-tree-pointer.mjs';
export function useBlankTreeSelection(clear){
 const pressed=useRef(false);
 return {onPointerDown:event=>{pressed.current=isBlankTreePress(event);},onPointerCancel:()=>{pressed.current=false;},onClick:event=>{const blank=pressed.current;pressed.current=false;if(blank&&isBlankTreeTarget(event))clear();}};
}
