import { GUIDE_IMAGE_MAX_BYTES } from "@offkai/core";
import sharp from "sharp";
import { AppError } from "../app-error";

export async function normalizeGuideImage(body: Buffer) {
	if (!body.length || body.length > GUIDE_IMAGE_MAX_BYTES) {
		throw new AppError("VALIDATION_ERROR", "画像は1枚10MB以下にしてください。");
	}
	try {
		const image = sharp(body, {
			limitInputPixels: 50_000_000,
			failOn: "warning",
		});
		const metadata = await image.metadata();
		if (
			!metadata.format ||
			!["jpeg", "png", "webp", "gif"].includes(metadata.format)
		)
			throw new Error("Unsupported image");
		// Decode and re-encode, stripping EXIF/GPS; normalize orientation and bound output size.
		// Animated inputs are intentionally saved as their first frame.
		return await image
			.rotate()
			.resize({
				width: 4096,
				height: 4096,
				fit: "inside",
				withoutEnlargement: true,
			})
			.webp({ quality: 90 })
			.toBuffer({ resolveWithObject: true });
	} catch {
		throw new AppError(
			"VALIDATION_ERROR",
			"画像を読み込めません。JPEG・PNG・WebP・GIF（5,000万画素以下）を選択してください。",
		);
	}
}
