import React, { useRef, useState } from "react";
import { SourceImageViewer } from "./source-image-viewer.jsx";
import "./source-generic-tool.css";
import { t } from "../electron/i18n/index.mjs";

// QO (approval-current.js:7398-7445): a tool's output images as a "flex flex-col items-start
// gap-1 pt-md" column of buttons ('View screenshot', cursor-zoom-in, rounded-sm, focus shadow),
// each holding the $oe thumbnail img (:7389-7397, "max-w-full max-h-[360px] w-auto rounded-[5px]
// border", alt ''). A press opens the image viewer on it ('Screenshot'). RN hoists the column out of a
// standalone row's collapsible body but keeps it in the row's own root, after the body (:17093,
// :17302; SourceStep's `after` slot), so the row stays one transcript item; FN puts it in the body of
// a row inside a group (:17324). The jg image context menu around each button is not ported.
export function SourceToolImages({ images, itemId }) {
  const [open, setOpen] = useState(null);
  const buttons = useRef([]);
  if (!images?.length) return null;
  return (
    <div className="stimg" data-tool-images-for={itemId}>
      {images.map((url, index) => (
        <button key={index} ref={(node) => { buttons.current[index] = node; }} type="button" className="stimg-button"
          aria-label={t("View screenshot")} onClick={() => setOpen(index)}>
          <img src={url} alt="" className="stimg-img" draggable={false} />
        </button>
      ))}
      {open !== null && images[open] ? (
        <SourceImageViewer src={images[open]} alt={t("Screenshot")} originRef={{ current: buttons.current[open] }} onClose={() => setOpen(null)} />
      ) : null}
    </div>
  );
}
