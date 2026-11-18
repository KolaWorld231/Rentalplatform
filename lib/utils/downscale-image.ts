const MAX_EDGE = 1600;
const QUALITY = 0.82;

/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * Phone cameras produce 4-12MB files. This product's renters and owners
 * are on intermittent, metered mobile data, so uploading the original
 * costs the owner real money and frequently fails partway on a weak
 * connection -- which is a plausible reason listings end up with no
 * photos at all. A 1600px long edge is still larger than any slot the
 * site renders.
 *
 * Returns the original file unchanged if anything goes wrong (no canvas,
 * an image the browser cannot decode, a result that is not actually
 * smaller). Shrinking is an optimisation, never a reason to lose the
 * upload.
 */
export async function downscaleImage(file: File): Promise<File> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);

    if (longest <= MAX_EDGE) {
      bitmap.close?.();
      return file;
    }

    const scale = MAX_EDGE / longest;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
