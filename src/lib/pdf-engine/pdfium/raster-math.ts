// Pure raster math, no WASM, no canvas - unit-tested in Node.

export interface PixelSize {
  width: number;
  height: number;
}

/** PDF points are 1/72 inch; pixels = points / 72 * dpi. Never below 1px. */
export function scaleForDpi(
  widthPt: number,
  heightPt: number,
  dpi: number,
): PixelSize {
  return {
    width: Math.max(1, Math.round((widthPt / 72) * dpi)),
    height: Math.max(1, Math.round((heightPt / 72) * dpi)),
  };
}

/** Scale so the longest edge equals maxEdgePx, preserving aspect ratio. */
export function scaleForMaxEdge(
  widthPt: number,
  heightPt: number,
  maxEdgePx: number,
): PixelSize {
  const scale = maxEdgePx / Math.max(widthPt, heightPt);
  return {
    width: Math.max(1, Math.round(widthPt * scale)),
    height: Math.max(1, Math.round(heightPt * scale)),
  };
}

/** In-place Rec. 601 luminance conversion of an RGBA buffer; alpha untouched. */
export function toGrayscaleRgba(data: Uint8ClampedArray | Uint8Array): void {
  for (let i = 0; i + 3 < data.length; i += 4) {
    const y = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
    );
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
}
