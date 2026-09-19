import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { services } from "@/services";
import { optimizeImage } from "@/lib/image-optimize";
import { fileNameOf, mediaUrl, type MediaRef } from "@/lib/media";

interface Props {
  label: string;
  bucket: string;
  accept?: string;
  value: MediaRef | null;
  onChange: (ref: MediaRef | null) => void;
}

function safeName(name: string) {
  return name.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
}

/**
 * Upload-or-pick field. On upload the file goes straight into Supabase Storage
 * and the canonical {bucket, path} reference is handed back to the editor —
 * no manual URL pasting anywhere in the pipeline.
 */
export function MediaField({ label, bucket, accept, value, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [percent, setPercent] = useState<number | null>(null);

  const existing = useQuery({
    queryKey: ["media-field", bucket],
    queryFn: async () => {
      const result = await services().storage.list(bucket);
      return result.error ? [] : result.data;
    },
  });

  async function handleFile(file: File) {
    const { file: payload } = await optimizeImage(file);
    const path = `${Date.now()}-${safeName(payload.name) || "file"}`;
    setPercent(0);
    const result = await services().storage.uploadWithProgress(bucket, path, payload, {
      onProgress: setPercent,
    });
    setPercent(null);
    if (result.error) {
      toast.error(`${file.name} failed to upload`, { description: result.error.message });
      return;
    }
    onChange({ bucket, path, name: payload.name, mimeType: payload.type, size: payload.size });
    void existing.refetch();
    toast.success(`${payload.name} uploaded and attached`);
  }

  const url = mediaUrl(value);
  const isImage = accept?.startsWith("image");
  const isAudio = accept?.startsWith("audio");
  const isVideo = accept?.startsWith("video");

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>

      {value && url && (
        <div className="surface-panel rounded-xl p-3">
          {isImage && <img src={url} alt="" className="max-h-44 w-full rounded-lg object-cover" />}
          {isAudio && <audio controls src={url} className="w-full" />}
          {isVideo && <video controls src={url} className="max-h-56 w-full rounded-lg" />}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="truncate text-xs text-muted-foreground">{fileNameOf(value)}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              <Trash2 className="size-4" aria-hidden /> Remove
            </Button>
          </div>
        </div>
      )}

      {percent !== null && (
        <div className="space-y-1">
          <Progress value={percent} />
          <p className="numeric text-xs text-muted-foreground">Uploading… {percent}%</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hairline-gold bg-transparent"
          disabled={percent !== null}
          onClick={() => input.current?.click()}
        >
          {percent !== null ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          Upload
        </Button>

        <Select
          value={value?.path ?? ""}
          onValueChange={(path) => {
            const item = (existing.data ?? []).find((entry) => entry.path === path);
            if (item)
              onChange({ bucket, path: item.path, name: item.name, mimeType: item.mimeType, size: item.size });
          }}
        >
          <SelectTrigger className="h-9 w-56">
            <SelectValue placeholder="or pick from library" />
          </SelectTrigger>
          <SelectContent>
            {(existing.data ?? []).map((item) => (
              <SelectItem key={item.path} value={item.path}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
