"use client";

import { useRef, useState } from "react";
import type { PointerEvent } from "react";

type InstructorSignatureCaptureProps = {
  onChange: (signature: string) => void;
};

export default function InstructorSignatureCapture({
  onChange,
}: InstructorSignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawnRef = useRef(false);
  const [typedSignature, setTypedSignature] = useState("");

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.strokeStyle = "#1f2937";
    if (event.type === "pointerdown") {
      canvas.setPointerCapture(event.pointerId);
      context.beginPath();
      context.moveTo(x, y);
      return;
    }
    drawnRef.current = true;
    context.lineTo(x, y);
    context.stroke();
  }

  function finishDrawing() {
    const canvas = canvasRef.current;
    if (canvas && drawnRef.current) onChange(canvas.toDataURL("image/png"));
  }

  function clearDrawing() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    drawnRef.current = false;
    onChange(typedSignature.trim());
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-ink">
        Typed signature (optional if drawing)
        <input
          autoComplete="off"
          className="mt-1 min-h-10 w-full rounded border border-ink/30 bg-surface px-3 py-2 font-serif text-lg italic focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onChange={(event) => {
            const value = event.target.value;
            setTypedSignature(value);
            onChange(value.trim());
          }}
          value={typedSignature}
        />
      </label>
      <div>
        <p className="mb-1 text-sm font-semibold text-ink">Or draw signature</p>
        <canvas
          aria-label="Draw instructor signature"
          className="block h-32 w-full touch-none rounded border border-ink/30 bg-white"
          height={256}
          onPointerDown={draw}
          onPointerMove={(event) => {
            if (event.buttons === 1) draw(event);
          }}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          ref={canvasRef}
          width={600}
        />
        <button
          className="mt-1 text-sm font-semibold text-link underline"
          onClick={clearDrawing}
          type="button"
        >
          Clear drawing
        </button>
      </div>
    </div>
  );
}
