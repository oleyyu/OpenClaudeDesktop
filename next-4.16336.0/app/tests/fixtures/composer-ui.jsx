import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { SourceComposer, SourceEffortPopover } from "../../src/source-composer";
import { SourceMenu } from "../../src/source-menu";
import "../../src/style.css";
import "../../src/source-composer.css";

// Isolated fixture data is never read by the production entry point.
const efforts = ["low", "medium", "high", "xhigh"].map((reasoningEffort) => ({
  reasoningEffort,
  description: `Fixture description for ${reasoningEffort} reasoning effort.`,
}));
const models = [
  {
    id: "fixture",
    model: "fixture",
    displayName: "Fixture model",
    supportedReasoningEfforts: efforts,
  },
];
function Fixture() {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [effort, setEffort] = useState("low");
  const [worktree, setWorktree] = useState(false);
  const [menu, setMenu] = useState(null);
  const [sent, setSent] = useState(0);
  const input = useRef(null);
  return (
    <div
      className="epitaxy-root"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "32px 0 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 832,
          padding: "0 32px",
          margin: "0 auto",
        }}
      >
        <output aria-label="Submitted messages">{sent}</output>
      </div>
      <div style={{ flex: 1 }} />
      <SourceComposer
        draft={draft}
        setDraft={setDraft}
        textarea={input}
        attachments={attachments}
        setAttachments={setAttachments}
        onSubmit={() => {
          setSent((value) => value + 1);
          setDraft("");
        }}
        workdir="/fixture/project"
        workspaceInfo={{ isRepo: true, branch: "main" }}
        onMenu={(kind, anchor) => setMenu({ kind, anchor })}
        model={models[0]}
        effort={effort}
        permission="auto"
        worktree={worktree}
        setWorktree={setWorktree}
        showPet
        isHome
        mode="code"
        onFolder={() => setAttachments(["/fixture/example.txt"])}
        onAddFolder={() => setAttachments(["/fixture/example.txt"])}
      />
      {/* The effort chip opens the CDS Popover host (source-composer.jsx SourceEffortPopover); every other
          chip opens a placeholder CDS menu in this isolated fixture. */}
      {menu && (menu.kind === "effort"
        ? <SourceEffortPopover anchor={menu.anchor} levels={efforts} value={effort} onChange={setEffort} onClose={() => setMenu(null)} />
        : <SourceMenu.Popup anchor={menu.anchor} side="top" align="end" label={menu.kind} onClose={() => setMenu(null)}>
            <SourceMenu.Item>{menu.kind} fixture menu</SourceMenu.Item>
          </SourceMenu.Popup>)}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Fixture />);
