"use client";

import { Eraser } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

// A tiny canvas signature pad: pointer events draw a line; export to PNG
// data URL. No external deps. Internal state tracks whether the user
// has drawn anything so the parent can disable Save on an empty canvas.

export type SignaturePadHandle = {
  isEmpty: () => boolean;
  toDataUrl: () => string;
  clear: () => void;
};

type Props = {
  ref?: React.Ref<SignaturePadHandle>;
  onChange?: (isEmpty: boolean) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
};

export function SignaturePad({
  ref,
  onChange,
  width = 600,
  height = 200,
  disabled,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useImperativeHandle(
    ref,
    () => ({
      isEmpty: () => empty,
      toDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? "",
      clear: () => clear(),
    }),
    [empty],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Match the bitmap to display size for crisp lines on hi-DPI screens.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0f172a";
  }, [width, height]);

  function getPoint(e: PointerEvent | React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = getPoint(e);
    lastPointRef.current = p;
    if (p) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        // Render a dot for tap-only signatures.
        ctx.lineTo(p.x + 0.01, p.y + 0.01);
        ctx.stroke();
      }
    }
    if (empty) {
      setEmpty(false);
      onChange?.(false);
    }
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const p = getPoint(e);
    const last = lastPointRef.current;
    if (!p || !last) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
  }

  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (drawingRef.current) {
      drawingRef.current = false;
      lastPointRef.current = null;
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // releasePointerCapture throws if the pointer was already released.
      }
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    // Re-apply transform + stroke style after the reset.
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0f172a";
    setEmpty(true);
    onChange?.(true);
  }

  return (
    <div className="space-y-2">
      <div className="inline-block rounded-md border border-stone-300 bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          className="touch-none"
          style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={disabled || empty}
        >
          <Eraser className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
        <span className="text-xs text-stone-500">
          {empty ? "Draw your signature above." : "Looks good."}
        </span>
      </div>
    </div>
  );
}
