import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizeGuideImage } from "./normalize-guide-image";

describe("guide image validation", () => {
	it("decodes, orients and strips metadata before storing", async () => {
		const source = await sharp({
			create: { width: 120, height: 80, channels: 3, background: "red" },
		})
			.jpeg()
			.withMetadata({ orientation: 6 })
			.toBuffer();
		const result = await normalizeGuideImage(source);
		expect(result.info.width).toBe(80);
		expect(result.info.height).toBe(120);
		const metadata = await sharp(result.data).metadata();
		expect(metadata.format).toBe("webp");
		expect(metadata.exif).toBeUndefined();
	});
	it("rejects forged types, SVG, empty and oversized files", async () => {
		for (const input of [
			Buffer.from("not an image"),
			Buffer.from(
				'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
			),
			Buffer.alloc(0),
			Buffer.alloc(10 * 1024 * 1024 + 1),
		]) {
			await expect(normalizeGuideImage(input)).rejects.toMatchObject({
				code: "VALIDATION_ERROR",
			});
		}
	});
});
