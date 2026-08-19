// Local implementations of the source/sink seam: files picked in the browser
// in, a browser download out. No engine imports beyond types.

import type { DocumentInput, SupportedMime } from "../types";
import type {
  DocumentSink,
  DocumentSource,
  SourceItem,
} from "./document-source";

const MIME_BY_EXTENSION: Record<string, SupportedMime> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

const SUPPORTED_MIMES: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

/**
 * Resolve a File to a supported engine mime, falling back to the extension
 * when the browser reports no type. Returns null for unsupported files.
 */
export function mimeForFile(file: {
  name: string;
  type: string;
}): SupportedMime | null {
  if (SUPPORTED_MIMES.includes(file.type)) return file.type as SupportedMime;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? null;
}

/** DocumentSource over an in-memory list of picked/dropped Files. */
export class LocalFileSource implements DocumentSource {
  private readonly files: ReadonlyArray<File>;

  constructor(files: File[]) {
    this.files = [...files];
  }

  async list(): Promise<SourceItem[]> {
    return this.files.map((file, index) => ({
      id: String(index),
      name: file.name,
      mime: mimeForFile(file) ?? file.type,
      sizeBytes: file.size,
    }));
  }

  async fetch(item: SourceItem): Promise<DocumentInput> {
    const file = this.files[Number(item.id)];
    if (!file) throw new Error(`Unknown file: ${item.name}`);
    const mime = mimeForFile(file);
    if (!mime) {
      throw new Error(
        `Unsupported file type for "${file.name}" - only PDF, JPEG, and PNG are accepted`,
      );
    }
    return { name: file.name, mime, bytes: await file.arrayBuffer() };
  }
}

/** DocumentSink that hands the bytes to the browser as a download. */
export class LocalDownloadSink implements DocumentSink {
  async save(file: { name: string; bytes: Uint8Array }): Promise<void> {
    const blob = new Blob([file.bytes as BlobPart], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
