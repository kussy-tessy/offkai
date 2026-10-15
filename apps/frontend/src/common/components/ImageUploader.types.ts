export interface ImageUploadContext {
  signal: AbortSignal;
  /** 0–100. Omit calls when the transport cannot report progress. */
  onProgress: (percent: number) => void;
}

/** Resolve only after the server has saved the image and its database record. */
export type ImageUploadHandler = (
  file: File,
  context: ImageUploadContext,
) => Promise<unknown>;

export interface ViewerImage {
  src: string;
  width: number;
  height: number;
  alt?: string;
}
