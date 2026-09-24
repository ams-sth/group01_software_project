const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

// Phone photos are often several MB — shrink them to a size that's still easily
// readable as a receipt before uploading. Re-encoding also drops EXIF metadata
// (like GPS location). Falls back to the original file if the browser can't
// decode it (e.g. HEIC outside Safari); the server then decides if it's allowed.
export async function compressImage(file: File): Promise<Blob> {
	try {
		const bitmap = await createImageBitmap(file, {
			imageOrientation: "from-image",
		});
		const scale = Math.min(
			1,
			MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
		);
		const canvas = document.createElement("canvas");
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas
			.getContext("2d")
			?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();

		const compressed = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
		);
		return compressed ?? file;
	} catch {
		return file;
	}
}
