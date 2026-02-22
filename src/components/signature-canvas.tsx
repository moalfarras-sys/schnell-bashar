"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  label?: string;
  errorMessage?: string;
}

export function SignaturePad({
  onSignatureChange,
  label = "Unterschrift",
  errorMessage,
}: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleEnd = useCallback(() => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setIsEmpty(false);
      onSignatureChange(sigRef.current.toDataURL("image/png"));
    }
  }, [onSignatureChange]);

  const handleClear = useCallback(() => {
    sigRef.current?.clear();
    setIsEmpty(true);
    onSignatureChange(null);
  }, [onSignatureChange]);

  useEffect(() => {
    function resize() {
      const canvas = sigRef.current?.getCanvas();
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sigRef.current?.clear();
      setIsEmpty(true);
      onSignatureChange(null);
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [onSignatureChange]);

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-200">
        {label}
      </label>
      <div
        ref={containerRef}
        className={`relative h-40 w-full overflow-hidden rounded-lg border bg-white ${
          errorMessage ? "border-red-500" : "border-slate-600"
        }`}
      >
        <SignatureCanvas
          ref={sigRef}
          penColor="#0f172a"
          minWidth={1.5}
          maxWidth={3}
          canvasProps={{
            className: "absolute inset-0 w-full h-full cursor-crosshair",
          }}
          onEnd={handleEnd}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Hier unterschreiben
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between">
        {errorMessage ? (
          <span className="text-xs text-red-400">{errorMessage}</span>
        ) : (
          <span className="text-xs text-slate-400">
            Bitte unterschreiben Sie im weißen Feld
          </span>
        )}
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-medium text-brand-400 hover:text-brand-300"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}
