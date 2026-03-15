export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  files?: AttachedFile[]; // Attached images/documents
}

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // data URL (base64)
  preview?: string; // preview URL for images
}

export interface MessageWithFiles extends Message {
  files?: AttachedFile[];
}
