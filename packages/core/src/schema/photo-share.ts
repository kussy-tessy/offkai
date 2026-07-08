import { z } from "zod";

export const PhotoShareUrlSchema = z
	.string()
	.trim()
	.min(1)
	.max(2048)
	.url()
	.refine((value) => {
		const protocol = new URL(value).protocol;
		return protocol === "http:" || protocol === "https:";
	}, "URLはhttpまたはhttpsで始まる必要があります")
	.brand("PhotoShareUrl");
export type PhotoShareUrl = z.infer<typeof PhotoShareUrlSchema>;

const nullableTextSchema = (max: number) =>
	z
		.string()
		.max(max)
		.nullable()
		.transform((value) => (value === "" ? null : value));

export const PhotoShareMetadataSchema = z.object({
	downloadDeadline: nullableTextSchema(50),
	password: nullableTextSchema(50),
	note: nullableTextSchema(200),
});
export type PhotoShareMetadata = z.infer<typeof PhotoShareMetadataSchema>;
