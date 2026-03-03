import { fileTypeFromBlob } from "file-type";

import type { AttachedFile } from "../types";

const SUPPORTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/xml",
  "text/css",
  "application/javascript",
  "text/x-python",
  "application/rtf",
] as const;

const SUPPORTED_DOCUMENT_MIME_TYPE_SET = new Set<string>(SUPPORTED_DOCUMENT_MIME_TYPES);

const MIME_ALIASES: Record<string, string> = {
  "text/x-markdown": "text/markdown",
  "text/xml": "application/xml",
  "text/javascript": "application/javascript",
  "text/python": "text/x-python",
  "application/x-python-code": "text/x-python",
  "text/rtf": "application/rtf",
};

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
  html: "text/html",
  htm: "text/html",
  xml: "application/xml",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  py: "text/x-python",
  rtf: "application/rtf",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const MIME_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "text/csv": "CSV",
  "text/html": "HTML",
  "application/xml": "XML",
  "text/css": "CSS",
  "application/javascript": "JS",
  "text/x-python": "PY",
  "application/rtf": "RTF",
  "application/json": "JSON",
  "application/zip": "ZIP",
  "application/x-tar": "TAR",
  "application/gzip": "GZ",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
};

export const AI_ATTACHMENT_INPUT_ACCEPT = "image/*,*/*";

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  return MIME_ALIASES[normalized] ?? normalized;
}

function isGenericBinaryMimeType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return normalized === "application/octet-stream";
}

function inferMimeTypeFromFileName(fileName: string): string | null {
  const extension = fileName.trim().toLowerCase().split(".").pop();
  if (!extension) {
    return null;
  }

  return EXTENSION_TO_MIME[extension] ?? null;
}

export function isImageMimeType(mimeType: string): boolean {
  return normalizeMimeType(mimeType).startsWith("image/");
}

export function isImageFile(file: AttachedFile): boolean {
  return isImageMimeType(file.type);
}

export function isSupportedAttachmentMimeType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  if (isImageMimeType(normalized)) {
    return true;
  }

  if (normalized.startsWith("text/")) {
    return true;
  }

  return SUPPORTED_DOCUMENT_MIME_TYPE_SET.has(normalized);
}

async function isLikelyTextFile(file: File): Promise<boolean> {
  const sampleBuffer = await file.slice(0, 8192).arrayBuffer();
  const bytes = new Uint8Array(sampleBuffer);
  if (bytes.length === 0) {
    return true;
  }

  let suspiciousControlBytes = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      return false;
    }

    const isAllowedControl = byte === 9 || byte === 10 || byte === 13 || byte === 12;
    const isAsciiPrintable = byte >= 32 && byte <= 126;
    const isHighByte = byte >= 128;

    if (!isAllowedControl && !isAsciiPrintable && !isHighByte) {
      suspiciousControlBytes += 1;
    }
  }

  return suspiciousControlBytes / bytes.length < 0.05;
}

export async function detectFileMimeType(file: File): Promise<string | null> {
  const detected = await fileTypeFromBlob(file).catch(() => undefined);

  const browserMimeType =
    typeof file.type === "string" && file.type.trim().length > 0 ? file.type : null;
  const extensionMimeType = inferMimeTypeFromFileName(file.name);
  const rawMimeType = detected?.mime ?? browserMimeType ?? extensionMimeType;

  if (rawMimeType) {
    const normalizedMimeType = normalizeMimeType(rawMimeType);
    if (!isGenericBinaryMimeType(normalizedMimeType)) {
      return normalizedMimeType;
    }
  }

  const maybeTextFile = await isLikelyTextFile(file);
  if (maybeTextFile) {
    return "text/plain";
  }

  return null;
}

export async function detectSupportedAttachmentMimeType(file: File): Promise<string | null> {
  const mimeType = await detectFileMimeType(file);
  if (!mimeType) {
    return null;
  }

  return isSupportedAttachmentMimeType(mimeType) ? mimeType : null;
}

export function getFileTypeLabel(file: AttachedFile): string {
  const normalizedMimeType = normalizeMimeType(file.type);
  if (normalizedMimeType === "text/plain") {
    const extension = file.name.split(".").pop()?.toUpperCase();
    if (extension && extension !== "TXT") {
      return extension;
    }
  }

  const mimeLabel = MIME_TYPE_LABELS[normalizedMimeType];
  if (mimeLabel) {
    return mimeLabel;
  }

  const extension = file.name.split(".").pop()?.toUpperCase();
  return extension || "FILE";
}

export function getFileTypeColor(file: AttachedFile): string {
  const label = getFileTypeLabel(file);

  switch (label) {
    case "PDF":
      return "bg-red-500";
    case "DOC":
    case "DOCX":
      return "bg-blue-500";
    case "XLS":
    case "XLSX":
      return "bg-green-600";
    case "TXT":
    case "MD":
      return "bg-gray-500";
    case "JSON":
    case "XML":
      return "bg-orange-500";
    case "JS":
    case "PY":
    case "CSS":
    case "HTML":
      return "bg-yellow-500";
    case "ZIP":
    case "TAR":
    case "GZ":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
}
