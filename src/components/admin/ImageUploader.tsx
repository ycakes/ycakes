"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Star, Trash2, Upload, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { uploadToCloudinary } from "@/lib/admin/cloudinaryUpload";

export type UploadedImage = { url: string; sort_order: number; is_primary: boolean };

export function ImageUploader({
  images,
  onChange,
  folder,
  multiple = true,
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  folder: string;
  multiple?: boolean;
}) {
  const t = useTranslations("Admin.imageUploader");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadToCloudinary(file, folder);
        uploaded.push({ url, sort_order: images.length + uploaded.length, is_primary: false });
      }
      const next = multiple ? [...images, ...uploaded] : uploaded.slice(0, 1);
      if (next.length > 0 && !next.some((img) => img.is_primary)) {
        next[0].is_primary = true;
      }
      onChange(next);
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function setPrimary(url: string) {
    onChange(images.map((img) => ({ ...img, is_primary: img.url === url })));
  }

  function remove(url: string) {
    const next = images.filter((img) => img.url !== url).map((img, i) => ({ ...img, sort_order: i }));
    if (next.length > 0 && !next.some((img) => img.is_primary)) {
      next[0].is_primary = true;
    }
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <div key={img.url} className="group relative size-24 shrink-0 overflow-hidden rounded-xl border-[1.5px] border-border-default bg-bg-surface-alt">
            <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
            {multiple && (
              <button
                type="button"
                onClick={() => setPrimary(img.url)}
                aria-label={t("setPrimary")}
                className="absolute start-1 top-1 rounded-full bg-black/50 p-1"
              >
                <Star className={img.is_primary ? "size-3.5 fill-yellow-400 text-yellow-400" : "size-3.5 text-white"} />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(img.url)}
              aria-label={t("remove")}
              className="absolute end-1 top-1 rounded-full bg-black/50 p-1"
            >
              <Trash2 className="size-3.5 text-white" />
            </button>
          </div>
        ))}
        {(multiple || images.length === 0) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-border-default text-text-secondary hover:bg-bg-surface-alt"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
            <span className="text-[11px]">{t("upload")}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
