"use client";

// The pdf.net-style editor: top bar, tool row, thumbnail rail, and page
// canvas, wired to the PDF engine hook and the editor store. Zones render
// from a LayoutConfig so task-specific variants can hide or reorder them
// later; DEFAULT_LAYOUT ships the full editor.
//
// Export flow: Download builds (merge-only unless a compressed build is
// already held), routes through the verification gate when pages were
// recompressed, then takeOutput -> LocalDownloadSink. A compressed build
// confirmed through the gate stays held as THE pending export.

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { uploadToGraphSession } from "@/lib/pdf-engine/sources/graph-upload";
import { LocalDownloadSink } from "@/lib/pdf-engine/sources/local";
import type {
  BuildOptions,
  BuildReport,
  PageId,
  Rotation,
} from "@/lib/pdf-engine/types";

import type { CaseDocumentItem } from "../case-documents-panel";
import { defaultFileName } from "../presets";
import { ProgressOverlay } from "../progress-overlay";
import {
  usePdfEngine,
  type MutationResult,
  type UsePdfEngine,
} from "../use-pdf-engine";
import { VerificationDialog } from "../verification-dialog";
import { PageCanvas } from "./canvas/page-canvas";
import { EditorProvider, useEditor } from "./editor-store";
import { ProgressToast } from "./progress-toast";
import { CaseFilesPanel } from "./sidebar/case-files-panel";
import { SidebarFrame } from "./sidebar/sidebar-frame";
import {
  ThumbnailRail,
  type PageClickModifiers,
} from "./sidebar/thumbnail-rail";
import { EditorToolbar, type ToolId } from "./toolbar";
import { TopBar } from "./top-bar";
import { CompressDialog } from "./tools/compress-dialog";
import { MergeDialog } from "./tools/merge-dialog";
import { PageNumbersPopover } from "./tools/page-numbers-popover";
import { RearrangeView } from "./tools/rearrange-view";
import { SaveDriveDialog } from "./tools/save-drive-dialog";
import { SplitDialog } from "./tools/split-dialog";
import { useEditorKeyboard } from "./use-editor-keyboard";

export type EditorZone = "topBar" | "toolbar" | "sidebar" | "canvas";

export interface LayoutConfig {
  /** Zones to render, in order. Omit a zone to hide it. */
  zones: readonly EditorZone[];
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  zones: ["topBar", "toolbar", "sidebar", "canvas"],
};

export interface EditorShellProps {
  // When opened from a case: its uploaded documents + a staff-gated server
  // action minting short-lived OneDrive download URLs. Bytes flow
  // browser-to-Microsoft directly; our server only hands out URLs.
  caseDocuments?: CaseDocumentItem[];
  getDownloadUrl?: (
    documentId: string,
  ) => Promise<{ url: string } | { error: string }>;
  // Case folder tree (files AND folders) for the sidebar, shown when the
  // editor is opened from a case.
  caseId?: string;
  listCaseFolder?: (
    caseId: string,
    folderItemId?: string,
  ) => Promise<{ items: import("@/app/(staff)/dashboard/pdf-tool/actions").CaseDriveItem[] } | { error: string }>;
  getDriveFileUrl?: (
    caseId: string,
    itemId: string,
  ) => Promise<{ url: string } | { error: string }>;
  /** Mints a Graph upload session into the case's "Final" folder. */
  createFinalUpload?: (
    caseId: string,
    fileName: string,
  ) => Promise<{ uploadUrl: string } | { error: string }>;
  /** Overrides the date-based default, e.g. "{caseNumber}_Submission_{date}". */
  initialTitle?: string;
  layout?: LayoutConfig;
}

export function EditorShell(props: EditorShellProps) {
  // Computed once per mount; the store owns it from there.
  const [initialTitle] = useState(
    () => props.initialTitle ?? defaultFileName(new Date()).replace(/\.pdf$/i, ""),
  );
  return (
    <EditorProvider title={initialTitle}>
      <EditorBody {...props} />
    </EditorProvider>
  );
}

function needsGate(report: BuildReport): boolean {
  return (
    (report.compression?.pagesRecompressed ?? 0) > 0 &&
    report.worstPages.length > 0
  );
}

function EditorBody({
  caseDocuments,
  getDownloadUrl,
  caseId,
  listCaseFolder,
  getDriveFileUrl,
  createFinalUpload,
  layout = DEFAULT_LAYOUT,
}: EditorShellProps) {
  const pdf: UsePdfEngine = usePdfEngine();
  const { state, dispatch } = useEditor();

  const [mergeOpen, setMergeOpen] = useState(false);

  // Source files whose pages are still in the package; drives the case
  // gallery's Added state so deleting pages re-enables Add.
  const activeFileNames = useMemo(() => {
    const activeDocIds = new Set(pdf.model?.pages.map((p) => p.documentId));
    return new Set(
      pdf.documents.filter((d) => activeDocIds.has(d.id)).map((d) => d.name),
    );
  }, [pdf.model, pdf.documents]);
  const [splitOpen, setSplitOpen] = useState(false);
  const [pageNumbersOpen, setPageNumbersOpen] = useState(false);
  const [compressOpen, setCompressOpen] = useState(false);

  /** True while a build meant for export runs - drives the modal overlay. */
  const [exporting, setExporting] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifySource, setVerifySource] = useState<
    "download" | "compress" | "onedrive"
  >("download");
  /** Whether the held build cleared (or never needed) the verification gate. */
  const [gatePassed, setGatePassed] = useState(false);
  // A verified build whose upload failed: kept so retry re-uploads the SAME
  // bytes instead of forcing a rebuild + re-verification (review finding).
  const [pendingUpload, setPendingUpload] = useState<{
    bytes: Uint8Array;
    name: string;
  } | null>(null);

  // Builds bake state.pageNumbers into the output, but the engine hook only
  // invalidates the held build on MODEL mutations. Changing page-number
  // options after a gate-passed build must drop it, or Download would export
  // stale bytes missing (or still carrying) the numbering.
  const prevPageNumbersRef = useRef(state.pageNumbers);
  useEffect(() => {
    if (prevPageNumbersRef.current === state.pageNumbers) return;
    prevPageNumbersRef.current = state.pageNumbers;
    setGatePassed(false);
    setVerifyOpen(false);
    void pdf.discardOutput();
  }, [state.pageNumbers, pdf]);

  // -------------------------------------------------------------------------
  // History-aware mutation commit: push the pre-mutation snapshot, drop
  // selection entries the mutation removed. Every mutation also drops any
  // held build (dropHeldBuild in the hook), which hides the verification
  // dialog without firing its onOpenChange; clear verifyOpen here so the
  // gate cannot reopen spuriously over a later unrelated build.
  // -------------------------------------------------------------------------
  const commit = useCallback(
    (result: MutationResult | null) => {
      if (!result) return;
      // Model changed: a kept-for-retry upload payload no longer matches.
      setPendingUpload(null);
      setVerifyOpen(false);
      dispatch({ type: "history/push", model: result.previous });
      dispatch({
        type: "select/prune",
        alive: result.next.pages.map((p) => p.id),
      });
    },
    [dispatch],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      // commit() clears any kept-for-retry payload.
      commit(await pdf.loadFiles(files));
    },
    [commit, pdf],
  );

  const handleReorder = useCallback(
    async (orderedPageIds: readonly PageId[]) => {
      commit(await pdf.reorder(orderedPageIds));
    },
    [commit, pdf],
  );

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------
  const handlePageClick = useCallback(
    (pageId: PageId, mods: PageClickModifiers) => {
      if (mods.range) {
        dispatch({
          type: "select/range",
          pageId,
          order: (pdf.model?.pages ?? []).map((p) => p.id),
        });
      } else if (mods.toggle) {
        dispatch({ type: "select/toggle", pageId });
      } else {
        dispatch({ type: "select/click", pageId });
      }
    },
    [dispatch, pdf.model],
  );

  const handleRailClick = useCallback(
    (pageId: PageId, mods: PageClickModifiers) => {
      handlePageClick(pageId, mods);
      document
        .getElementById(`canvas-page-${pageId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    [handlePageClick],
  );

  /** Pages an instant tool acts on: the selection, else the current page. */
  const targetIds = useCallback((): ReadonlySet<PageId> | null => {
    if (state.selection.size > 0) return state.selection;
    if (state.currentPage) return new Set([state.currentPage]);
    return null;
  }, [state.selection, state.currentPage]);

  // -------------------------------------------------------------------------
  // Instant tools + keyboard actions
  // -------------------------------------------------------------------------
  const rotateTargets = useCallback(async () => {
    const model = pdf.model;
    const targets = targetIds();
    if (!model || !targets) return;
    const refs = model.pages.map((p) =>
      targets.has(p.id)
        ? { ...p, rotation: ((p.rotation + 90) % 360) as Rotation }
        : p,
    );
    commit(await pdf.applyModel(refs));
  }, [pdf, targetIds, commit]);

  const deleteTargets = useCallback(async () => {
    const targets = targetIds();
    if (!targets) return;
    commit(await pdf.deletePages([...targets]));
  }, [pdf, targetIds, commit]);

  const movePage = useCallback(
    async (direction: 1 | -1) => {
      const model = pdf.model;
      if (!model) return;
      const id =
        state.selection.size === 1
          ? [...state.selection][0]
          : state.currentPage;
      if (!id) return;
      const ids = model.pages.map((p) => p.id);
      const index = ids.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= ids.length) return;
      commit(await pdf.reorder(arrayMove(ids, index, target)));
    },
    [pdf, state.selection, state.currentPage, commit],
  );

  // Double-fire guard for undo/redo (held-down Cmd+Z autorepeats, rapid
  // clicks): the run() mutex releases before React re-renders, so a repeat
  // call could re-read the STALE history closure and pop the stack twice for
  // one engine change. The lock is cleared in an effect, not after dispatch,
  // so it holds until fresh closures exist.
  const historyLockRef = useRef(false);
  useEffect(() => {
    historyLockRef.current = false;
  }, [state.history]);

  const undo = useCallback(async () => {
    if (historyLockRef.current) return;
    const snapshot = state.history.past[state.history.past.length - 1];
    if (!snapshot) return;
    historyLockRef.current = true;
    const result = await pdf.applyModel(snapshot.pages);
    if (!result) {
      historyLockRef.current = false;
      return;
    }
    setVerifyOpen(false);
    dispatch({ type: "history/undo", current: result.previous });
    dispatch({
      type: "select/prune",
      alive: result.next.pages.map((p) => p.id),
    });
  }, [state.history.past, pdf, dispatch]);

  const redo = useCallback(async () => {
    if (historyLockRef.current) return;
    const snapshot = state.history.future[0];
    if (!snapshot) return;
    historyLockRef.current = true;
    const result = await pdf.applyModel(snapshot.pages);
    if (!result) {
      historyLockRef.current = false;
      return;
    }
    setVerifyOpen(false);
    dispatch({ type: "history/redo", current: result.previous });
    dispatch({
      type: "select/prune",
      alive: result.next.pages.map((p) => p.id),
    });
  }, [state.history.future, pdf, dispatch]);

  useEditorKeyboard({
    onDelete: () => void deleteTargets(),
    onMoveUp: () => void movePage(-1),
    onMoveDown: () => void movePage(1),
    onUndo: () => void undo(),
    onRedo: () => void redo(),
  });

  // -------------------------------------------------------------------------
  // Export flow
  // -------------------------------------------------------------------------
  const saveOutput = useCallback(async () => {
    const out = await pdf.takeOutput();
    if (!out) return;
    const base = state.title.trim() || "Submission_Package";
    const name = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
    await new LocalDownloadSink().save({ name, bytes: out.bytes });
    setGatePassed(false);
  }, [pdf, state.title]);

  const handleDownload = useCallback(async () => {
    if (!pdf.model || pdf.model.pages.length === 0) return;
    // A compressed build confirmed through the gate is the pending export.
    if (pdf.lastBuild && gatePassed) {
      await saveOutput();
      return;
    }
    setExporting(true);
    try {
      const options: BuildOptions = {
        compression: { targetBytes: compressTargetRef.current },
      };
      if (state.pageNumbers) options.pageNumbers = state.pageNumbers;
      const report = await pdf.build(options);
      if (!report) return;
      if (needsGate(report)) {
        setVerifySource("download");
        setVerifyOpen(true);
        return;
      }
      await saveOutput();
    } finally {
      setExporting(false);
    }
  }, [pdf, gatePassed, state.pageNumbers, saveOutput]);

  // Save-to-OneDrive: same pipeline as download, different sink. The bytes
  // are PUT directly to Microsoft via a pre-authenticated upload session.
  const [savingToDrive, setSavingToDrive] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Last compression target staff chose; fresh export builds re-apply it so
  // "compress, download, then save" cannot silently produce an uncompressed
  // file (review finding). Sticky for the session.
  const compressTargetRef = useRef<number | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  /** Name chosen by the exporter in the save dialog; survives the gate. */
  const [driveFileName, setDriveFileName] = useState("");

  const saveToOneDrive = useCallback(async (nameOverride?: string) => {
    if (!caseId || !createFinalUpload) return;
    // Retry path: a previous upload failed after the build was consumed;
    // re-use those exact bytes. Otherwise take the held build.
    let payload = pendingUpload;
    if (!payload) {
      const out = await pdf.takeOutput();
      if (!out) return;
      const base =
        (nameOverride ?? driveFileName).trim() ||
        state.title.trim() ||
        "Submission_Package";
      const name = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
      payload = { bytes: out.bytes, name };
    } else if (nameOverride?.trim()) {
      let renamed = nameOverride.trim();
      if (!renamed.toLowerCase().endsWith(".pdf")) renamed = `${renamed}.pdf`;
      payload = { bytes: payload.bytes, name: renamed };
    }
    setSavingToDrive(true);
    setSaveError(null);
    setGatePassed(false);
    try {
      const session = await createFinalUpload(caseId, payload.name);
      if ("error" in session) throw new Error(session.error);
      const item = await uploadToGraphSession(session.uploadUrl, payload.bytes);
      setPendingUpload(null);
      setSavedUrl(item.webUrl);
      setSaveSuccess(true);
    } catch (err) {
      // Keep the bytes for a retry; the button re-uploads without rebuilding.
      setPendingUpload(payload);
      setSaveSuccess(false);
      setSaveError(
        `${err instanceof Error ? err.message : "OneDrive upload failed."} The built file is kept - click Save to OneDrive to retry.`,
      );
    } finally {
      setSavingToDrive(false);
    }
  }, [caseId, createFinalUpload, pdf, state.title, driveFileName, pendingUpload]);

  const handleSaveToOneDrive = useCallback(async (nameOverride?: string) => {
    if (!pdf.model || pdf.model.pages.length === 0) return;
    if (pendingUpload || (pdf.lastBuild && gatePassed)) {
      await saveToOneDrive(nameOverride);
      return;
    }
    setExporting(true);
    try {
      const options: BuildOptions = {
        compression: { targetBytes: compressTargetRef.current },
      };
      if (state.pageNumbers) options.pageNumbers = state.pageNumbers;
      const report = await pdf.build(options);
      if (!report) return;
      if (needsGate(report)) {
        setVerifySource("onedrive");
        setVerifyOpen(true);
        return;
      }
      await saveToOneDrive(nameOverride);
    } finally {
      setExporting(false);
    }
  }, [pdf, gatePassed, state.pageNumbers, saveToOneDrive, pendingUpload]);

  const handleCompress = useCallback(
    async (targetBytes: number) => {
      compressTargetRef.current = targetBytes;
      setGatePassed(false);
      setExporting(true);
      try {
        const options: BuildOptions = { compression: { targetBytes } };
        if (state.pageNumbers) options.pageNumbers = state.pageNumbers;
        const report = await pdf.build(options);
        if (!report) return;
        if (needsGate(report)) {
          setVerifySource("compress");
          setVerifyOpen(true);
        } else {
          setGatePassed(true);
        }
      } finally {
        setExporting(false);
      }
    },
    [pdf, state.pageNumbers],
  );

  const handleVerifyConfirm = useCallback(() => {
    setVerifyOpen(false);
    setGatePassed(true);
    if (verifySource === "download") void saveOutput();
    if (verifySource === "onedrive") void saveToOneDrive();
  }, [verifySource, saveOutput, saveToOneDrive]);

  const handleVerifyCancel = useCallback(() => {
    setVerifyOpen(false);
    setGatePassed(false);
    void pdf.discardOutput();
  }, [pdf]);

  // -------------------------------------------------------------------------
  // Toolbar dispatch
  // -------------------------------------------------------------------------
  const handleTool = useCallback(
    (id: ToolId) => {
      switch (id) {
        case "select":
          dispatch({ type: "tool/set", tool: "select" });
          break;
        case "rearrange":
          dispatch({ type: "tool/set", tool: "rearrange" });
          break;
        case "merge":
          setMergeOpen(true);
          break;
        case "rotate":
          void rotateTargets();
          break;
        case "delete":
          void deleteTargets();
          break;
        case "page-numbers":
          setPageNumbersOpen(true);
          break;
        case "split":
          setSplitOpen(true);
          break;
        case "compress":
          setCompressOpen(true);
          break;
      }
    },
    [dispatch, rotateTargets, deleteTargets],
  );

  const selectedPositions = useMemo(
    () =>
      (pdf.model?.pages ?? []).flatMap((p, i) =>
        state.selection.has(p.id) ? [i + 1] : [],
      ),
    [pdf.model, state.selection],
  );

  const hasPages = (pdf.model?.pages.length ?? 0) > 0;
  const has = (zone: EditorZone) => layout.zones.includes(zone);
  const mainZones = layout.zones.filter(
    (z): z is "sidebar" | "canvas" => z === "sidebar" || z === "canvas",
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {has("topBar") && (
        <TopBar
          title={state.title}
          onTitleChange={(title) => dispatch({ type: "title/set", title })}
          canUndo={state.history.past.length > 0 && !pdf.acting}
          canRedo={state.history.future.length > 0 && !pdf.acting}
          onUndo={() => void undo()}
          onRedo={() => void redo()}
          zoom={state.zoom}
          onZoomStep={(direction) => dispatch({ type: "zoom/step", direction })}
          canDownload={hasPages && !pdf.acting}
          downloading={exporting}
          onDownload={() => void handleDownload()}
          onSaveToOneDrive={
            caseId && createFinalUpload
              ? () => {
                  setDriveFileName(state.title.trim());
                  setSaveDialogOpen(true);
                }
              : undefined
          }
          savingToDrive={savingToDrive}
        />
      )}

      {has("toolbar") && (
        <EditorToolbar
          activeTool={state.activeTool}
          pageNumbersSet={state.pageNumbers !== null}
          disabled={pdf.acting}
          onTool={handleTool}
        />
      )}

      {pdf.error && (
        <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {pdf.error}
        </p>
      )}

      {saveError && (
        <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {saveError}
        </p>
      )}
      {saveSuccess && !saveError && (
        <p className="flex items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          <span>
            Saved to the case&apos;s Final folder in OneDrive.
            {savedUrl && (
              <>
                {" "}
                <a
                  href={savedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-2"
                >
                  Open file
                </a>
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setSaveSuccess(false);
              setSavedUrl(null);
            }}
            className="text-xs text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {mainZones.map((zone) =>
          zone === "sidebar" ? (
            <SidebarFrame
              key="sidebar"
              filesPanel={
                caseId && listCaseFolder && getDriveFileUrl ? (
                  <CaseFilesPanel
                    caseId={caseId}
                    listChildren={listCaseFolder}
                    getFileUrl={getDriveFileUrl}
                    onAddFiles={async (files) => {
                      await handleFiles(files);
                    }}
                    activeFileNames={activeFileNames}
                    disabled={pdf.acting}
                  />
                ) : undefined
              }
              rail={
                <ThumbnailRail
                  model={pdf.model}
                  thumbnails={pdf.thumbnails}
                  disabled={pdf.acting}
                  onReorder={(order) => void handleReorder(order)}
                  onPageClick={handleRailClick}
                  onAddPage={() => setMergeOpen(true)}
                />
              }
            />
          ) : state.activeTool === "rearrange" ? (
            <RearrangeView
              key="canvas"
              model={pdf.model}
              thumbnails={pdf.thumbnails}
              disabled={pdf.acting}
              onReorder={(order) => void handleReorder(order)}
              onDone={() => dispatch({ type: "tool/set", tool: "select" })}
            />
          ) : (
            <PageCanvas
              key="canvas"
              model={pdf.model}
              thumbnails={pdf.thumbnails}
              renderPreview={pdf.renderPreview}
              onPageClick={handlePageClick}
              onAddPage={() => setMergeOpen(true)}
            />
          ),
        )}
      </div>

      <MergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        documents={pdf.documents}
        inputWarning={pdf.inputWarning}
        disabled={pdf.acting}
        onFiles={handleFiles}
        caseDocuments={caseDocuments}
        getDownloadUrl={getDownloadUrl}
      />

      <SaveDriveDialog
        open={saveDialogOpen}
        defaultName={state.title.trim()}
        saving={savingToDrive}
        onCancel={() => setSaveDialogOpen(false)}
        onSave={(fileName) => {
          setDriveFileName(fileName);
          setSaveDialogOpen(false);
          void handleSaveToOneDrive(fileName);
        }}
      />

      <SplitDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        model={pdf.model}
        title={state.title}
        selectedPositions={selectedPositions}
        disabled={pdf.acting}
        exportRange={pdf.exportRange}
      />

      <PageNumbersPopover
        open={pageNumbersOpen}
        onOpenChange={setPageNumbersOpen}
      />

      <CompressDialog
        open={compressOpen}
        onOpenChange={setCompressOpen}
        model={pdf.model}
        report={pdf.lastBuild}
        gatePassed={gatePassed}
        disabled={pdf.acting}
        preflight={pdf.preflight}
        onCompress={handleCompress}
      />

      <VerificationDialog
        open={verifyOpen && pdf.lastBuild !== null}
        worstPages={pdf.lastBuild?.worstPages ?? []}
        model={pdf.model}
        renderComparison={pdf.renderComparison}
        onDownload={handleVerifyConfirm}
        onCancel={handleVerifyCancel}
      />

      {exporting ? (
        <ProgressOverlay busy={pdf.busy} />
      ) : (
        <ProgressToast busy={pdf.busy} />
      )}
    </div>
  );
}
