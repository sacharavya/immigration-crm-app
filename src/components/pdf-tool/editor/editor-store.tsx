"use client";

// Editor UI state for the pdf.net-style editor: active mode tool, page
// selection, zoom, title, page-number options, and undo/redo history of
// PageModel snapshots. The reducer is pure (unit-tested under node:test);
// the engine model itself lives in use-pdf-engine - history here only holds
// snapshots to feed engine.applyModel on undo/redo.

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import type {
  PageId,
  PageModel,
  PageNumberOptions,
} from "@/lib/pdf-engine/types";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;
export const HISTORY_CAP = 50;

/** Tools that persist as a mode; everything else is instant or a dialog. */
export type ModeTool = "select" | "rearrange";

export interface EditorState {
  activeTool: ModeTool;
  selection: ReadonlySet<PageId>;
  /** Anchor for shift-range selection: the last plain/cmd click. */
  anchor: PageId | null;
  /** Page the rail rings: follows clicks and canvas scroll position. */
  currentPage: PageId | null;
  zoom: number;
  /** Export file name, without the .pdf extension. */
  title: string;
  /** null = no page numbers at export. */
  pageNumbers: PageNumberOptions | null;
  history: { past: PageModel[]; future: PageModel[] };
}

export type EditorAction =
  | { type: "tool/set"; tool: ModeTool }
  | { type: "select/click"; pageId: PageId }
  | { type: "select/toggle"; pageId: PageId }
  | { type: "select/range"; pageId: PageId; order: readonly PageId[] }
  | { type: "select/clear" }
  /** Drop selection/current entries no longer in the model (delete, undo). */
  | { type: "select/prune"; alive: readonly PageId[] }
  | { type: "current/set"; pageId: PageId | null }
  | { type: "zoom/set"; zoom: number }
  | { type: "zoom/step"; direction: 1 | -1 }
  | { type: "title/set"; title: string }
  | { type: "pageNumbers/set"; options: PageNumberOptions | null }
  /** A mutation confirmed by the worker: push the pre-mutation snapshot. */
  | { type: "history/push"; model: PageModel }
  | { type: "history/undo"; current: PageModel }
  | { type: "history/redo"; current: PageModel };

export function initialEditorState(title: string): EditorState {
  return {
    activeTool: "select",
    selection: new Set<PageId>(),
    anchor: null,
    currentPage: null,
    zoom: 1,
    title,
    pageNumbers: null,
    history: { past: [], future: [] },
  };
}

function clampZoom(zoom: number): number {
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  // One decimal - avoids 0.1-step float drift (0.7000000000000001).
  return Math.round(clamped * 10) / 10;
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "tool/set":
      return { ...state, activeTool: action.tool };

    case "select/click":
      return {
        ...state,
        selection: new Set([action.pageId]),
        anchor: action.pageId,
        currentPage: action.pageId,
      };

    case "select/toggle": {
      const selection = new Set(state.selection);
      if (selection.has(action.pageId)) selection.delete(action.pageId);
      else selection.add(action.pageId);
      return {
        ...state,
        selection,
        anchor: action.pageId,
        currentPage: action.pageId,
      };
    }

    case "select/range": {
      const from = state.anchor
        ? action.order.indexOf(state.anchor)
        : -1;
      const to = action.order.indexOf(action.pageId);
      if (from < 0 || to < 0) {
        // No usable anchor: behave like a plain click.
        return editorReducer(state, {
          type: "select/click",
          pageId: action.pageId,
        });
      }
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      return {
        ...state,
        selection: new Set(action.order.slice(lo, hi + 1)),
        currentPage: action.pageId,
      };
    }

    case "select/clear":
      return { ...state, selection: new Set<PageId>(), anchor: null };

    case "select/prune": {
      const alive = new Set(action.alive);
      const selection = new Set(
        [...state.selection].filter((id) => alive.has(id)),
      );
      return {
        ...state,
        selection,
        anchor: state.anchor && alive.has(state.anchor) ? state.anchor : null,
        currentPage:
          state.currentPage && alive.has(state.currentPage)
            ? state.currentPage
            : null,
      };
    }

    case "current/set":
      return { ...state, currentPage: action.pageId };

    case "zoom/set":
      return { ...state, zoom: clampZoom(action.zoom) };

    case "zoom/step":
      return {
        ...state,
        zoom: clampZoom(state.zoom + action.direction * ZOOM_STEP),
      };

    case "title/set":
      return { ...state, title: action.title };

    case "pageNumbers/set":
      return { ...state, pageNumbers: action.options };

    case "history/push":
      return {
        ...state,
        history: {
          past: [...state.history.past, action.model].slice(-HISTORY_CAP),
          future: [],
        },
      };

    case "history/undo": {
      const { past, future } = state.history;
      if (past.length === 0) return state;
      return {
        ...state,
        history: {
          past: past.slice(0, -1),
          future: [action.current, ...future],
        },
      };
    }

    case "history/redo": {
      const { past, future } = state.history;
      if (future.length === 0) return state;
      return {
        ...state,
        history: {
          past: [...past, action.current].slice(-HISTORY_CAP),
          future: future.slice(1),
        },
      };
    }
  }
}

interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(editorReducer, title, initialEditorState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
