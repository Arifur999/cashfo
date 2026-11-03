"use client";

import { Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import Loader from "@/components/shared/Loader";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The round window the photo is framed in, and the square it is saved as.
const FRAME = 240;
const OUTPUT = 512;
const MAX_ZOOM = 3;
const STEP = 10;

interface PhotoCropDialogProps {
  // The picked file; null while closed.
  file: File | null;
  onClose: () => void;
  // Another file, picked from the dialog's own link.
  onPickAnother: () => void;
  // The framed photo as a square JPEG; resolves when it is saved.
  onSave: (photo: File) => Promise<boolean>;
}

interface Frame {
  zoom: number;
  // Where the photo's top-left corner sits in the window, in px.
  x: number;
  y: number;
}

// Keeps the photo covering the whole window.
function clamp(frame: Frame, width: number, height: number): Frame {
  return { zoom: frame.zoom, x: Math.min(0, Math.max(FRAME - width, frame.x)), y: Math.min(0, Math.max(FRAME - height, frame.y)) };
}

// "Adjust your photo" (SettingsProfile board): drag the photo in the round
// window, zoom with the slider or the buttons (arrow keys move it too),
// then save the square it frames.
export function PhotoCropDialog({ file, onClose, onPickAnother, onSave }: PhotoCropDialogProps) {
  const { t } = useLocale();
  const [source, setSource] = useState<{ url: string; width: number; height: number } | null>(null);
  const [frame, setFrame] = useState<Frame>({ zoom: 1, x: 0, y: 0 });
  const [saving, startSaving] = useTransition();
  const drag = useRef<{ pointer: number; x: number; y: number } | null>(null);
  const image = useRef<HTMLImageElement | null>(null);

  // Each file is read afresh; its address is let go when it is done with.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    let live = true;
    const loaded = new Image();
    loaded.onload = () => {
      if (!live) return;
      image.current = loaded;
      const base = FRAME / Math.min(loaded.naturalWidth, loaded.naturalHeight);
      setSource({ url, width: loaded.naturalWidth, height: loaded.naturalHeight });
      setFrame({ zoom: 1, x: (FRAME - loaded.naturalWidth * base) / 2, y: (FRAME - loaded.naturalHeight * base) / 2 });
    };
    loaded.src = url;
    return () => {
      live = false;
      URL.revokeObjectURL(url);
      setSource(null);
    };
  }, [file]);

  const base = source ? FRAME / Math.min(source.width, source.height) : 1;
  const scale = base * frame.zoom;
  const shownWidth = source ? source.width * scale : FRAME;
  const shownHeight = source ? source.height * scale : FRAME;

  // A new zoom keeps the point at the window's centre where it is.
  function zoomTo(next: number) {
    if (!source) return;
    const zoom = Math.min(MAX_ZOOM, Math.max(1, next));
    setFrame((current) => {
      const before = base * current.zoom;
      const after = base * zoom;
      const centreX = (FRAME / 2 - current.x) / before;
      const centreY = (FRAME / 2 - current.y) / before;
      return clamp({ zoom, x: FRAME / 2 - centreX * after, y: FRAME / 2 - centreY * after }, source.width * after, source.height * after);
    });
  }

  function moveBy(dx: number, dy: number) {
    setFrame((current) => clamp({ ...current, x: current.x + dx, y: current.y + dy }, shownWidth, shownHeight));
  }

  function save() {
    const loaded = image.current;
    if (!loaded || !source || saving) return;
    startSaving(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const context = canvas.getContext("2d");
      if (!context) return;
      const side = FRAME / scale;
      context.drawImage(loaded, -frame.x / scale, -frame.y / scale, side, side, 0, 0, OUTPUT, OUTPUT);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) return;
      if (await onSave(new File([blob], "photo.jpg", { type: "image/jpeg" }))) onClose();
    });
  }

  const sizeText = file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB` : "";

  return (
    <AlertDialog open={file !== null} onOpenChange={(next) => !next && !saving && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 shadow-overlay ring-0">
        <div className="flex items-start gap-3 px-5.5 pt-5 pb-1.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
            <AlertDialogTitle className="text-[18px] font-semibold text-ink">{t("Adjust your photo")}</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-ink-muted">{t("Drag to move it. Use the slider to zoom.")}</AlertDialogDescription>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-2 hover:bg-line disabled:opacity-60">
            <X className="size-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-4 px-5.5 pt-3.5 pb-4.5">
          <div
            role="img"
            tabIndex={0}
            aria-label={t("Adjust your photo")}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
            }}
            onPointerMove={(event) => {
              const start = drag.current;
              if (!start || start.pointer !== event.pointerId) return;
              moveBy(event.clientX - start.x, event.clientY - start.y);
              drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(event) => {
              const moves: Record<string, [number, number]> = { ArrowLeft: [STEP, 0], ArrowRight: [-STEP, 0], ArrowUp: [0, STEP], ArrowDown: [0, -STEP] };
              const move = moves[event.key];
              if (!move) return;
              event.preventDefault();
              moveBy(...move);
            }}
            className="relative size-60 cursor-grab touch-none overflow-hidden rounded-full bg-ink ring-6 ring-emerald-soft outline-none select-none focus-visible:ring-focus-ring/60 active:cursor-grabbing"
          >
            {source && (
              // eslint-disable-next-line @next/next/no-img-element -- a local blob being framed, never a page image
              <img
                src={source.url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{ left: frame.x, top: frame.y, width: shownWidth, height: shownHeight }}
              />
            )}
          </div>
          <div className="flex w-full items-center gap-3">
            <button type="button" onClick={() => zoomTo(frame.zoom - 0.25)} aria-label={t("Zoom out")} className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 hover:bg-surface-sunken">
              <Minus className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
            </button>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.05}
              value={frame.zoom}
              onChange={(event) => zoomTo(Number(event.target.value))}
              aria-label={t("Zoom")}
              className="h-1.5 flex-1 cursor-pointer accent-emerald"
            />
            <button type="button" onClick={() => zoomTo(frame.zoom + 0.25)} aria-label={t("Zoom in")} className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 hover:bg-surface-sunken">
              <Plus className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
          <span className="max-w-full truncate text-[12.5px] text-ink-muted" lang="en">
            {sizeText}
          </span>
        </div>
        <div className="flex items-center gap-2.5 border-t border-divider bg-strip px-5.5 py-3.5">
          <button type="button" onClick={onPickAnother} disabled={saving} className="flex-1 text-left text-[13.5px] font-semibold text-emerald hover:underline disabled:opacity-60">
            {t("Choose another photo")}
          </button>
          <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-full border border-input bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60">
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={!source || saving} className="flex h-10 items-center gap-2 rounded-full bg-primary px-4.5 text-[14px] font-semibold text-primary-foreground hover:bg-emerald-hover disabled:opacity-60">
            {saving && <Loader size={14} onDark label={t("Loading...")} />}
            {t("Save photo")}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
