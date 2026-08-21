"use client";

// Global editor shortcuts. Keys are ignored while focus sits in an input,
// textarea, or contenteditable so typing in the title or a dialog field
// never deletes pages, and while any dialog is open so shortcuts cannot
// mutate pages (or drop a held build) behind a modal.

import { useEffect, useRef } from "react";

export interface EditorKeyboardHandlers {
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function useEditorKeyboard(handlers: EditorKeyboardHandlers): void {
  // Ref so the listener is attached once but always sees fresh closures.
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      // An open dialog traps focus but keydown still bubbles to window.
      // Base UI unmounts closed popups, so a mounted dialog means open.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) ref.current.onRedo();
        else ref.current.onUndo();
        return;
      }
      if (mod) return;

      switch (e.key) {
        case "Delete":
        case "Backspace":
          e.preventDefault();
          ref.current.onDelete();
          break;
        case "ArrowUp":
          e.preventDefault();
          ref.current.onMoveUp();
          break;
        case "ArrowDown":
          e.preventDefault();
          ref.current.onMoveDown();
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
