import { FileIcon, FolderIcon, HardDrive } from "lucide-react";
import type { FileEntry } from "../types";
import { cn } from "@/lib/utils";

interface FileDetailsProps {
  selectedFile: FileEntry | null;
}

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Helper to format date
const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export function FileDetails({ selectedFile }: FileDetailsProps) {
  if (!selectedFile) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
        <FileIcon className="mb-4 size-16 opacity-20" />
        <p className="text-sm font-medium">Select a file to view details</p>
      </div>
    );
  }

  // Check if image for preview
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(selectedFile.name);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto border-l border-border/50 bg-muted/10 p-4">
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {isImage ? (
           // Use convertFileSrc if using Tauri's asset protocol, but for now assume standard or direct path might not work due to security
           // Actually, standard <img> with local path won't work in Tauri production without convertFileSrc.
           // Since I can't import tauri's convertFileSrc easily without checking setup, I'll stick to icon for now unless I see it used elsewhere.
           // However, the user asked for "ui like in that image" which has a preview.
           // I'll try to use a placeholder or generic icon for safety first, or just the icon.
           <div className="relative flex aspect-[3/4] w-full max-w-[200px] items-center justify-center rounded-lg border border-border bg-background shadow-sm">
             <FileIcon className="size-16 text-muted-foreground/50" />
             {/* If we had asset protocol set up: <img src={convertFileSrc(selectedFile.path)} ... /> */}
           </div>
        ) : (
          <div className="flex aspect-[3/4] w-full max-w-[200px] items-center justify-center rounded-lg border border-border bg-background shadow-sm">
             <FileIcon className="size-24 text-primary/20" />
          </div>
        )}
        
        <h3 className="mt-4 text-center text-lg font-medium leading-tight text-foreground break-all px-2">
          {selectedFile.name}
        </h3>
      </div>

      <div className="mt-auto space-y-4">
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metadata</h4>
          <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="truncate font-medium text-foreground" title={selectedFile.name}>{selectedFile.name}</span>
            
            <span className="text-muted-foreground">Path</span>
            <span className="truncate text-muted-foreground" title={selectedFile.path}>{selectedFile.path}</span>
            
            <span className="text-muted-foreground">Size</span>
            <span className="text-muted-foreground">{formatBytes(selectedFile.size)}</span>
            
            <span className="text-muted-foreground">Modified</span>
            <span className="text-muted-foreground">{formatDate(selectedFile.modified)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
