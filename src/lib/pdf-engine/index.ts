// Main-thread entry for the PDF engine. Use from "use client" contexts only;
// no React in here. All heavy processing happens in the worker - this file
// just moves handles and callbacks across the Comlink boundary.

import * as Comlink from "comlink";
import type {
  BuildOptions,
  DocumentInput,
  PageId,
  PdfEngine,
  ProgressCallback,
  Rotation,
} from "./types";

export interface PdfEngineClient extends PdfEngine {
  terminate(): void;
}

export function createPdfEngineClient(): PdfEngineClient {
  const worker = new Worker(new URL("./engine.worker.ts", import.meta.url), {
    type: "module",
  });
  const remote = Comlink.wrap<PdfEngine>(worker);

  const proxied = (cb?: ProgressCallback) =>
    cb ? Comlink.proxy(cb) : undefined;

  return {
    loadDocuments: (inputs: DocumentInput[], onProgress?: ProgressCallback) =>
      // Zero-copy: the input buffers move to the worker and are unusable here after.
      remote.loadDocuments(
        Comlink.transfer(inputs, inputs.map((i) => i.bytes)),
        proxied(onProgress),
      ),
    getModel: () => remote.getModel(),
    renderThumbnail: (pageId: PageId, maxEdgePx: number) =>
      remote.renderThumbnail(pageId, maxEdgePx),
    renderPreview: (pageId: PageId, maxEdgePx: number) =>
      remote.renderPreview(pageId, maxEdgePx),
    reorder: (orderedPageIds: readonly PageId[]) =>
      remote.reorder(orderedPageIds),
    rotate: (pageId: PageId, rotation: Rotation) =>
      remote.rotate(pageId, rotation),
    deletePages: (pageIds: readonly PageId[]) => remote.deletePages(pageIds),
    preflightCompression: (options: BuildOptions) =>
      remote.preflightCompression(options),
    build: (options: BuildOptions, onProgress?: ProgressCallback) =>
      remote.build(options, proxied(onProgress)),
    renderComparison: (pageId: PageId, maxEdgePx: number) =>
      remote.renderComparison(pageId, maxEdgePx),
    takeOutput: () => remote.takeOutput(),
    discardOutput: () => remote.discardOutput(),
    reset: () => remote.reset(),
    terminate: () => worker.terminate(),
  };
}
