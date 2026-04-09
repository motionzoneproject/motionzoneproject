import probe from "probe-image-size";

/**
 * Fetches just enough bytes from the remote URL to read the image dimensions
 * (probe-image-size uses HTTP range requests where possible).
 * Returns null if probing fails — callers should fall back to a sensible default.
 */
export async function probeImageDimensions(
  url: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const result = await probe(url);
    return { width: result.width, height: result.height };
  } catch (err) {
    console.error(`probeImageDimensions: failed to probe "${url}":`, err);
    return null;
  }
}
