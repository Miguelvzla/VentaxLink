"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";

interface Props {
  file: File;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

type Ratio = "1:1" | "4:3" | "3:4" | "16:9" | "libre";

const RATIOS: { label: string; value: Ratio }[] = [
  { label: "Cuadrado", value: "1:1" },
  { label: "Paisaje 4:3", value: "4:3" },
  { label: "Retrato 3:4", value: "3:4" },
  { label: "Panorama", value: "16:9" },
  { label: "Libre", value: "libre" },
];

function ratioToNumber(r: Ratio): number | undefined {
  if (r === "1:1") return 1;
  if (r === "4:3") return 4 / 3;
  if (r === "3:4") return 3 / 4;
  if (r === "16:9") return 16 / 9;
  return undefined;
}

function buildInitialCrop(
  imgWidth: number,
  imgHeight: number,
  ratio: Ratio,
): Crop {
  const aspect = ratioToNumber(ratio);
  if (aspect) {
    return centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, aspect, imgWidth, imgHeight),
      imgWidth,
      imgHeight,
    );
  }
  return { unit: "%", x: 5, y: 5, width: 90, height: 90 };
}

async function cropImageToFile(
  imgEl: HTMLImageElement,
  pixelCrop: PixelCrop,
  originalName: string,
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;

  ctx.drawImage(
    imgEl,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Error al recortar")); return; }
      const ext = originalName.match(/\.(png|gif|webp)$/i) ? originalName.match(/\.(png|gif|webp)$/i)![1] : "jpg";
      const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
      const base = originalName.replace(/\.[^.]+$/, "");
      resolve(new File([blob], `${base}-crop.${ext}`, { type: mime }));
    }, "image/jpeg", 0.92);
  });
}

export function ImageCropModal({ file, onCrop, onCancel }: Props) {
  const [objectUrl, setObjectUrl] = useState<string>("");
  const [ratio, setRatio] = useState<Ratio>("1:1");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [applying, setApplying] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      const initial = buildInitialCrop(
        e.currentTarget.width,
        e.currentTarget.height,
        ratio,
      );
      setCrop(initial);
      // Also set completedCrop so "Aplicar" is active right away if user doesn't drag
      const scaleX = naturalWidth / e.currentTarget.width;
      const scaleY = naturalHeight / e.currentTarget.height;
      if (initial.unit === "%") {
        const pxX = (initial.x / 100) * e.currentTarget.width;
        const pxY = (initial.y / 100) * e.currentTarget.height;
        const pxW = (initial.width / 100) * e.currentTarget.width;
        const pxH = (initial.height / 100) * e.currentTarget.height;
        setCompletedCrop({ unit: "px", x: pxX, y: pxY, width: pxW, height: pxH });
        void scaleX; void scaleY;
      }
    },
    [ratio],
  );

  function changeRatio(r: Ratio) {
    setRatio(r);
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    const initial = buildInitialCrop(width, height, r);
    setCrop(initial);
  }

  async function handleApply() {
    if (!completedCrop || !imgRef.current) return;
    setApplying(true);
    try {
      const cropped = await cropImageToFile(imgRef.current, completedCrop, file.name);
      onCrop(cropped);
    } catch {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111827]">Ajustar imagen</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-[#6B7280] hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Ratio buttons */}
        <div className="flex flex-wrap gap-2">
          {RATIOS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => changeRatio(r.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                ratio === r.value
                  ? "bg-[#22C55E] text-white"
                  : "border border-gray-200 bg-white text-[#374151] hover:bg-gray-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Crop area */}
        <div className="flex max-h-[55vh] items-center justify-center overflow-auto rounded-xl bg-gray-900">
          {objectUrl && (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={ratioToNumber(ratio)}
              minWidth={30}
              minHeight={30}
              className="max-w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={objectUrl}
                alt="Vista previa"
                onLoad={onImageLoad}
                className="max-h-[50vh] max-w-full object-contain"
              />
            </ReactCrop>
          )}
        </div>

        <p className="text-xs text-[#6B7280]">
          Arrastrá los bordes del recuadro para ajustar el área que querés mostrar.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={applying || !completedCrop}
            onClick={() => void handleApply()}
            className="rounded-xl bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-50"
          >
            {applying ? "Aplicando…" : "Aplicar recorte"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#374151] hover:bg-gray-50"
          >
            Usar original
          </button>
        </div>
      </div>
    </div>
  );
}
