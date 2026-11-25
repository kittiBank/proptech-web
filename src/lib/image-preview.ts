/**
 * Reads the image size and makes a small JPEG preview. The mock API keeps the
 * preview as the "hosted" photo; a real upload sends the file itself.
 */
export async function describeImage(file: File): Promise<{ width: number; height: number; preview: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 640 / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { width: bitmap.width, height: bitmap.height, preview: canvas.toDataURL("image/jpeg", 0.72) };
  } catch {
    // Formats the browser cannot decode (HEIC on most desktops): let the server decide.
    const preview = typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "data:,";
    return { width: 1600, height: 1200, preview };
  }
}
