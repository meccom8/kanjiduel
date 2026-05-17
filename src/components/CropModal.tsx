"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface CropResult {
  blob: Blob;
  isGif: boolean;
  /** For GIFs only: CSS transform to apply on display */
  crop?: { tx: number; ty: number; zoom: number };
  /** For GIFs only: first-frame static PNG blob */
  staticBlob?: Blob | null;
}

interface CropModalProps {
  file: File;
  /** "circle" for avatar (square output), "banner" for wide rect */
  shape: "circle" | "banner";
  onConfirm: (result: CropResult) => void;
  onCancel: () => void;
}

/** Extract the first frame of a GIF as a PNG blob (using canvas) */
async function gifFirstFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || 256;
      c.height = img.naturalHeight || 256;
      c.getContext("2d")?.drawImage(img, 0, 0);
      c.toBlob((b) => { URL.revokeObjectURL(url); resolve(b); }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export default function CropModal({ file, shape, onConfirm, onCancel }: CropModalProps) {
  const isGif = file.type === "image/gif";
  const objUrl = useRef(URL.createObjectURL(file));

  // Container dimensions
  const W = shape === "circle" ? 220 : 320;
  const H = shape === "circle" ? 220 : 130;

  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef({ active: false, lx: 0, ly: 0 });

  useEffect(() => {
    const url = objUrl.current;
    return () => URL.revokeObjectURL(url);
  }, []);

  const maxTx = (W * (zoom - 1)) / 2;
  const maxTy = (H * (zoom - 1)) / 2;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // Clamp offsets when zoom changes
  useEffect(() => {
    setTx(t => clamp(t, -maxTx, maxTx));
    setTy(t => clamp(t, -maxTy, maxTy));
  }, [zoom]);

  /* ── Mouse events ── */
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { active: true, lx: e.clientX, ly: e.clientY };
  };
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.lx;
    const dy = e.clientY - drag.current.ly;
    drag.current.lx = e.clientX;
    drag.current.ly = e.clientY;
    setTx(t => clamp(t + dx, -maxTx, maxTx));
    setTy(t => clamp(t + dy, -maxTy, maxTy));
  }, [maxTx, maxTy]);
  const onMouseUp = useCallback(() => { drag.current.active = false; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  /* ── Touch events ── */
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    drag.current = { active: true, lx: t.clientX, ly: t.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current.active) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - drag.current.lx;
    const dy = t.clientY - drag.current.ly;
    drag.current.lx = t.clientX;
    drag.current.ly = t.clientY;
    setTx(prev => clamp(prev + dx, -maxTx, maxTx));
    setTy(prev => clamp(prev + dy, -maxTy, maxTy));
  };

  /* ── Canvas crop helper (non-GIF) ── */
  function drawToCanvas(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = imgRef.current!;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      // Calculate cover-fit dimensions
      const ia = imgSize.w / imgSize.h;
      const ca = W / H;
      const [dw, dh] = ia > ca ? [H * ia, H] : [W, W / ia];
      ctx.save();
      ctx.translate(W / 2 + tx, H / 2 + ty);
      ctx.scale(zoom, zoom);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("canvas toBlob failed")), "image/jpeg", 0.92);
    });
  }

  const handleConfirm = async () => {
    if (isGif) {
      // Store position/zoom values; also extract static frame
      const txPct = tx / W;
      const tyPct = ty / H;
      const staticBlob = await gifFirstFrame(file);
      onConfirm({ blob: file, isGif: true, crop: { tx: txPct, ty: tyPct, zoom }, staticBlob });
    } else {
      const blob = await drawToCanvas();
      onConfirm({ blob, isGif: false });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-5 slide-up"
        style={{ background: "#0d0d1a", border: "1px solid rgba(127,119,221,0.35)" }}>

        <p className="font-semibold mb-0.5">
          Adjust your {shape === "circle" ? "photo" : "banner"}
        </p>
        <p className="text-xs text-white/40 mb-4">Drag to reposition · slider to zoom</p>

        {/* Crop preview */}
        <div className="flex justify-center mb-4">
          <div
            style={{
              width: W, height: H,
              borderRadius: shape === "circle" ? "50%" : 12,
              overflow: "hidden",
              cursor: "grab",
              flexShrink: 0,
              border: "2px solid rgba(127,119,221,0.4)",
              userSelect: "none",
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={() => { drag.current.active = false; }}
          >
            <img
              ref={imgRef}
              src={objUrl.current}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
              }}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                transform: `translate(${tx}px,${ty}px) scale(${zoom})`,
                transformOrigin: "center",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          </div>
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm">🔍</span>
          <input type="range" min={100} max={300} value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(parseInt(e.target.value) / 100)}
            className="flex-1" style={{ accentColor: "#7F77DD" }} />
          <span className="text-sm">🔎</span>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Cancel
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "linear-gradient(135deg,#534AB7,#7F77DD)", color: "#fff" }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Apply stored GIF crop values as inline style on an <img> element.
 * tx/ty are stored as a fraction of the *container* size.
 */
export function gifCropStyle(
  crop: { tx: number; ty: number; zoom: number } | null | undefined,
  containerW: number,
  containerH: number,
): React.CSSProperties {
  if (!crop || (crop.tx === 0 && crop.ty === 0 && crop.zoom === 1)) return {};
  return {
    transform: `translate(${crop.tx * containerW}px,${crop.ty * containerH}px) scale(${crop.zoom})`,
    transformOrigin: "center",
  };
}
