import { useRef, useState } from "react";
import { Upload, Loader2, X, Link2 } from "lucide-react";
import { uploadImage } from "../lib/cloudinary";
import { useToast } from "./Toast";
import { TextInput } from "./FormField";

interface Props {
  /** Current image URL, or empty string. */
  value: string;
  /** Called with the new URL after upload, or "" when cleared. */
  onChange: (url: string) => void;
  /** Label above the field. */
  label: string;
  /** Aspect ratio class for the preview, e.g. "aspect-square", "aspect-video". */
  aspectClass?: string;
  /** Optional hint text. */
  hint?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label,
  aspectClass = "aspect-square",
  hint,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value);
  const toast = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage(file);
      onChange(result.secureUrl);
      toast.success("Image uploaded", "Ready");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed.",
        "Upload error",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = () => {
    onChange(urlDraft.trim());
    setShowUrlInput(false);
    toast.success("Image URL set", "Saved");
  };

  const handleRemove = () => {
    onChange("");
    setUrlDraft("");
  };

  return (
    <div className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-textSecondary">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrlInput((s) => !s)}
            className="text-[11px] text-textSecondary hover:text-peach inline-flex items-center gap-1"
          >
            <Link2 className="w-3 h-3" />
            {showUrlInput ? "Cancel URL" : "Paste URL instead"}
          </button>
        </div>
      </div>

      {showUrlInput && (
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <TextInput
              label=""
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyUrl}
            className="self-end px-3 py-2 rounded-lg bg-peach text-midnight text-xs font-medium hover:bg-coral transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`relative ${aspectClass} w-28 md:w-32 shrink-0 rounded-xl overflow-hidden border border-purpleDark/60 bg-midnight/60 flex items-center justify-center`}
        >
          {value ? (
            <>
              <img
                src={value}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.2";
                }}
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-midnight/80 hover:bg-coral text-textPrimary"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <Upload className="w-6 h-6 text-textSecondary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigoDeep border border-purpleDark/70 text-textPrimary text-sm hover:bg-purpleDark/60 transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {value ? "Replace image" : "Upload image"}
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          {hint && (
            <p className="text-[11px] text-textSecondary mt-2">{hint}</p>
          )}
          {!hint && (
            <p className="text-[11px] text-textSecondary mt-2">
              JPG, PNG, GIF, WebP. Max 15 MB. Hosted on Cloudinary.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
