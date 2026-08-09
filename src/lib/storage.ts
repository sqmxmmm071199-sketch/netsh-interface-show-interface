import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StorageProvider = "local-mock";

export type StoredAssetFile = {
  provider: StorageProvider;
  fileName: string;
  fileType: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  sizeBytes: number;
};

export type UploadAssetFileInput = {
  file: File;
  workspaceId: string;
  batchId: string;
};

const publicUploadRoot = path.join(process.cwd(), "public", "mock-uploads");
const publicRoot = path.join(process.cwd(), "public");
const maxTextBytes = 24_000;

function sanitizeFileName(fileName: string) {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const safeBaseName =
    baseName
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, "")
      .slice(0, 80) || "asset";

  return `${safeBaseName}${ext.toLowerCase()}`;
}

function isImage(fileType: string) {
  return fileType.startsWith("image/");
}

function resolvePublicUrlPath(fileUrl: string) {
  if (!fileUrl.startsWith("/")) return null;

  const cleanUrl = decodeURIComponent(fileUrl.split("?")[0] ?? fileUrl);
  const relativePath = cleanUrl.replace(/^\/+/, "");
  const absolutePath = path.resolve(publicRoot, relativePath);
  const publicRootPath = path.resolve(publicRoot);

  if (
    absolutePath !== publicRootPath &&
    !absolutePath.startsWith(`${publicRootPath}${path.sep}`)
  ) {
    return null;
  }

  return absolutePath;
}

export async function readPublicFile(fileUrl: string) {
  const absolutePath = resolvePublicUrlPath(fileUrl);
  if (!absolutePath) return null;

  return readFile(absolutePath).catch(() => null);
}

export async function readPublicFileAsDataUrl(fileUrl: string, fileType?: string | null) {
  const bytes = await readPublicFile(fileUrl);
  if (!bytes) return null;

  const mimeType = fileType || "application/octet-stream";
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

export async function readPublicTextFile(fileUrl: string) {
  const bytes = await readPublicFile(fileUrl);
  if (!bytes) return null;

  return bytes.subarray(0, maxTextBytes).toString("utf8");
}

export async function uploadAssetFile({
  file,
  workspaceId,
  batchId,
}: UploadAssetFileInput): Promise<StoredAssetFile> {
  const fileName = sanitizeFileName(file.name);
  const storedFileName = `${Date.now()}-${randomUUID()}-${fileName}`;
  const relativeFolder = path.join(workspaceId, batchId);
  const absoluteFolder = path.join(publicUploadRoot, relativeFolder);
  const absolutePath = path.join(absoluteFolder, storedFileName);

  await mkdir(absoluteFolder, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  const publicUrl = `/mock-uploads/${workspaceId}/${batchId}/${storedFileName}`;
  const fileType = file.type || "application/octet-stream";

  return {
    provider: "local-mock",
    fileName: file.name,
    fileType,
    fileUrl: publicUrl,
    thumbnailUrl: isImage(fileType) ? publicUrl : null,
    sizeBytes: file.size,
  };
}
