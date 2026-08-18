// Worker entry: exposes the engine over Comlink. Keep this file
// dependency-light - everything heavy (pdf-lib, PDFium WASM) loads inside
// PdfEngineImpl, and WASM only on first render.

import * as Comlink from "comlink";
import { PdfEngineImpl } from "./engine-impl";

Comlink.expose(new PdfEngineImpl());
