const IMAGE_DATA_URL_PREFIX = "data:image/";
const IMAGE_EXTENSIONS = new Set([
  "apng",
  "avif",
  "bmp",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

function getUrlFileExtension(value: string): string | null {
  try {
    const parsedUrl = new URL(value);
    const pathname = parsedUrl.pathname.trim().toLowerCase();
    const lastSegment = pathname.split("/").pop();

    if (!lastSegment || !lastSegment.includes(".")) {
      return null;
    }

    return lastSegment.split(".").pop() ?? null;
  } catch {
    return null;
  }
}

export function isPreviewableImageValue(value: string): boolean {
  if (value.startsWith(IMAGE_DATA_URL_PREFIX)) {
    return true;
  }

  const extension = getUrlFileExtension(value);
  return extension !== null && IMAGE_EXTENSIONS.has(extension);
}
