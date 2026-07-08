import { v7 as uuidv7 } from "uuid";
import {
	type OffkaiEventId,
	type PhotoShareId,
	type PhotoShareMetadata,
	PhotoShareMetadataSchema,
	type PhotoShareUrl,
	PhotoShareUrlSchema,
	type UserId,
} from "../schema";

export class PhotoShare {
	private constructor(
		readonly id: PhotoShareId,
		readonly eventId: OffkaiEventId,
		readonly uploaderUserId: UserId,
		readonly url: PhotoShareUrl,
		readonly downloadDeadline: string | null,
		readonly password: string | null,
		readonly note: string | null,
	) {}

	static reconstruct(params: {
		id: PhotoShareId;
		eventId: OffkaiEventId;
		uploaderUserId: UserId;
		url: PhotoShareUrl;
		downloadDeadline: string | null;
		password: string | null;
		note: string | null;
	}): PhotoShare {
		return new PhotoShare(
			params.id,
			params.eventId,
			params.uploaderUserId,
			params.url,
			params.downloadDeadline,
			params.password,
			params.note,
		);
	}

	static create(params: {
		eventId: OffkaiEventId;
		uploaderUserId: UserId;
		url: string;
		metadata: PhotoShareMetadata;
	}): PhotoShare {
		const url = PhotoShareUrlSchema.parse(params.url);
		const metadata = PhotoShareMetadataSchema.parse(params.metadata);

		return new PhotoShare(
			uuidv7() as PhotoShareId,
			params.eventId,
			params.uploaderUserId,
			url,
			metadata.downloadDeadline,
			metadata.password,
			metadata.note,
		);
	}

	edit(metadata: PhotoShareMetadata): PhotoShare {
		const validated = PhotoShareMetadataSchema.parse(metadata);

		return new PhotoShare(
			this.id,
			this.eventId,
			this.uploaderUserId,
			this.url,
			validated.downloadDeadline,
			validated.password,
			validated.note,
		);
	}

	isUploadedBy(userId: UserId): boolean {
		return this.uploaderUserId === userId;
	}
}
