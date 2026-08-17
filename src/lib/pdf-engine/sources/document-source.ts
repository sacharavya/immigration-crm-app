// Adapter seam ABOVE the engine: where documents come from and where the
// final PDF goes. The engine itself speaks bytes only. v1 ships Local*
// implementations; a OneDrive/Microsoft Graph pair drops in later without
// touching the engine.

import type { DocumentInput } from "../types";

export interface SourceItem {
  id: string;
  name: string;
  mime: string;
  sizeBytes: number;
}

export interface DocumentSource {
  list(): Promise<SourceItem[]>;
  /** Fetch the item's bytes as an engine input. */
  fetch(item: SourceItem): Promise<DocumentInput>;
}

export interface DocumentSink {
  save(file: { name: string; bytes: Uint8Array }): Promise<void>;
}
