import { UploadCloud } from "lucide-react";

export function FileUpload({ accept = "*" }: { accept?: string }) {
  return (
    <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-card p-6 text-center transition-colors hover:bg-muted/50">
      <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />
      <span className="text-sm font-medium">Selecionar arquivo</span>
      <span className="mt-1 text-xs text-muted-foreground">
        Upload seguro preparado para S3 ou Supabase Storage
      </span>
      <input className="sr-only" type="file" accept={accept} />
    </label>
  );
}
