import React, { use, useMemo } from 'react';
import { FileBreadcrumb } from './generated/code-current/breadcrumb-file.mjs';
import { pathWithinRoot } from './generated/code-current/breadcrumb-paths.mjs';
import { QueryClientProvider } from './generated/files-changes/file-browser-query.mjs';
import { CurrentSessionIdContext } from './generated/files-changes/session-context.mjs';
import { fileBrowserQueryClient, folderLister } from './source-breadcrumb-adapters.jsx';
import { SourceFileMenuEntries } from './source-file-menu-entries.jsx';
import { SourceMenu } from './source-menu.jsx';

// Source-owned layout and measurement (2.42304.0 cd2efac6e Yl over cfac349aa Kt). Only file-list/menu services cross
// the host boundary; absolute segment paths are retained for the scoped file IPC.
// - lister: the host's scoped folder listing, handed to the original as cd2efac6e wt's local lister (sessionId from the
//   session pane's context, scope "local"); its folder popovers query it through the app's QueryClient.
// - askIfGone (cd2efac6e Tp): a segment's menu asks whether its path still exists for a local session's file, or a
//   folder inside the session root; the answer arrives as renderSegmentMenu's `gone` (no Open in / Show in Finder /
//   Open in terminal / Reveal in file tree then).
export function SourceFileBreadcrumb({ displayPath, fullPath, tooltipPath = fullPath ?? displayPath,
  posix = !/^[A-Za-z]:|^\\\\/.test(fullPath ?? displayPath), onCopyPath, lister = null, segmentMenu = null }) {
  const sessionId = use(CurrentSessionIdContext);
  const folders = useMemo(() => folderLister(lister, sessionId), [lister, sessionId]);
  const renderSegmentMenu = segmentMenu ? ({ absPath, isDirectory, heading, gone }) => {
    const target = { path: absPath, directory: isDirectory, gone: gone === true,
      outside: !!lister && !pathWithinRoot(absPath, lister.root, posix) };
    const entries = segmentMenu.entries(target);
    return <>{heading && <SourceMenu.GroupLabel>{heading}</SourceMenu.GroupLabel>}
      <SourceFileMenuEntries entries={entries} onSelect={item => segmentMenu.select(item, target)} /></>;
  } : undefined;
  const askIfGone = lister ? ({ absPath, isDirectory }) => !isDirectory || pathWithinRoot(absPath, lister.root, posix) : undefined;
  return <span className="source-file-breadcrumb" data-breadcrumb-lister={lister ? '' : undefined}>
    <QueryClientProvider client={fileBrowserQueryClient}>
      <FileBreadcrumb displayPath={displayPath} fullPath={fullPath ?? displayPath} tooltipPath={tooltipPath} posix={posix}
        onCopyPath={onCopyPath || undefined} lister={folders} onOpenFile={lister?.onOpenFile}
        renderSegmentMenu={renderSegmentMenu} askIfGone={askIfGone} byline={null} />
    </QueryClientProvider>
  </span>;
}
