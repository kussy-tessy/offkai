import { z } from "zod";
import {
	ISODateTimeStringSchema,
	OffkaiEventIdSchema,
	PhotoShareMetadataSchema,
	PhotoShareIdSchema,
	PhotoShareUrlSchema,
	UserIdSchema,
	UserNameSchema,
} from "../../schema";

export const PhotoShareViewSchema = z.object({
	id: PhotoShareIdSchema,
	url: PhotoShareUrlSchema,
	...PhotoShareMetadataSchema.shape,
	uploader: z.object({
		id: UserIdSchema,
		displayName: UserNameSchema,
	}),
	downloadedByMe: z.boolean(),
	canEdit: z.boolean(),
	createdAt: ISODateTimeStringSchema,
	updatedAt: ISODateTimeStringSchema,
});
export type PhotoShareView = z.infer<typeof PhotoShareViewSchema>;

export const PhotoShareRouteParamsSchema = z.object({
	eventId: OffkaiEventIdSchema,
});
export type PhotoShareRouteParams = z.infer<typeof PhotoShareRouteParamsSchema>;

export const PhotoShareItemRouteParamsSchema = z.object({
	eventId: OffkaiEventIdSchema,
	photoShareId: PhotoShareIdSchema,
});
export type PhotoShareItemRouteParams = z.infer<
	typeof PhotoShareItemRouteParamsSchema
>;

export const CreatePhotoShareRequestSchema = PhotoShareRouteParamsSchema.extend(
	{
		url: PhotoShareUrlSchema,
		...PhotoShareMetadataSchema.shape,
	},
).strict();
export type CreatePhotoShareRequest = z.infer<
	typeof CreatePhotoShareRequestSchema
>;

export const UpdatePhotoShareRequestSchema =
	PhotoShareItemRouteParamsSchema.extend(
		PhotoShareMetadataSchema.shape,
	).strict();
export type UpdatePhotoShareRequest = z.infer<
	typeof UpdatePhotoShareRequestSchema
>;

export const UpdatePhotoDownloadStatusRequestSchema =
	PhotoShareItemRouteParamsSchema.extend({
		downloaded: z.boolean(),
	}).strict();
export type UpdatePhotoDownloadStatusRequest = z.infer<
	typeof UpdatePhotoDownloadStatusRequestSchema
>;

export const GetPhotoSharesResponseSchema = z.object({
	event: z.object({
		id: OffkaiEventIdSchema,
		title: z.string(),
	}),
	photoShares: z.array(PhotoShareViewSchema),
});
export type GetPhotoSharesResponse = z.infer<
	typeof GetPhotoSharesResponseSchema
>;

export const CreatePhotoShareResponseSchema = PhotoShareViewSchema;
export type CreatePhotoShareResponse = PhotoShareView;

export const UpdatePhotoShareResponseSchema = PhotoShareViewSchema;
export type UpdatePhotoShareResponse = PhotoShareView;

export const UpdatePhotoDownloadStatusResponseSchema = z.object({
	ok: z.literal(true),
});
export type UpdatePhotoDownloadStatusResponse = z.infer<
	typeof UpdatePhotoDownloadStatusResponseSchema
>;
