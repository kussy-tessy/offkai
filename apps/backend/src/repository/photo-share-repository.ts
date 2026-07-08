import {
	GetPhotoSharesResponseSchema,
	type GetPhotoSharesResponse,
	type OffkaiEventId,
	PhotoShare,
	type PhotoShareId,
	PhotoShareIdSchema,
	PhotoShareMetadataSchema,
	type PhotoShareUrl,
	PhotoShareUrlSchema,
	type PhotoShareView,
	PhotoShareViewSchema,
	type Unbrand,
	type UserId,
	UserIdSchema,
} from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class PhotoShareRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async hasAnswer(eventId: OffkaiEventId, userId: UserId): Promise<boolean> {
		const answer = await this.prisma.offkaiAnswer.findUnique({
			where: { eventId_userId: { eventId, userId } },
			select: { id: true },
		});
		return answer !== null;
	}

	async findById(
		eventId: OffkaiEventId,
		photoShareId: PhotoShareId,
	): Promise<PhotoShare | null> {
		const record = await this.prisma.offkaiPhotoShare.findFirst({
			where: { id: photoShareId, eventId },
		});
		if (!record) return null;

		const metadata = PhotoShareMetadataSchema.parse(record);
		return PhotoShare.reconstruct({
			id: PhotoShareIdSchema.parse(record.id),
			eventId,
			uploaderUserId: UserIdSchema.parse(record.uploaderUserId),
			url: PhotoShareUrlSchema.parse(record.url),
			...metadata,
		});
	}

	async save(photoShare: PhotoShare): Promise<void> {
		await this.prisma.offkaiPhotoShare.upsert({
			where: { id: photoShare.id },
			create: {
				id: photoShare.id,
				eventId: photoShare.eventId,
				uploaderUserId: photoShare.uploaderUserId,
				url: photoShare.url,
				downloadDeadline: photoShare.downloadDeadline,
				password: photoShare.password,
				note: photoShare.note,
			},
			update: {
				downloadDeadline: photoShare.downloadDeadline,
				password: photoShare.password,
				note: photoShare.note,
			},
		});
	}

	async delete(photoShareId: PhotoShareId): Promise<void> {
		await this.prisma.offkaiPhotoShare.delete({
			where: { id: photoShareId },
		});
	}

	async getPage(
		eventId: OffkaiEventId,
		userId: UserId,
	): Promise<Unbrand<GetPhotoSharesResponse> | null> {
		const event = await this.prisma.offkaiEvent.findUnique({
			where: { id: eventId },
			select: {
				id: true,
				name: true,
				photoShares: {
					orderBy: [{ createdAt: "desc" }, { id: "desc" }],
					include: {
						uploader: { select: { id: true, name: true } },
						downloadStatuses: {
							where: { userId },
							select: { userId: true },
						},
					},
				},
			},
		});
		if (!event) return null;

		return GetPhotoSharesResponseSchema.parse({
			event: { id: event.id, title: event.name },
			photoShares: event.photoShares.map((share) =>
				this.toPhotoShareView(share, userId),
			),
		});
	}

	async findViewById(
		eventId: OffkaiEventId,
		photoShareId: PhotoShareId,
		userId: UserId,
	): Promise<Unbrand<PhotoShareView> | null> {
		const share = await this.prisma.offkaiPhotoShare.findFirst({
			where: { id: photoShareId, eventId },
			include: {
				uploader: { select: { id: true, name: true } },
				downloadStatuses: {
					where: { userId },
					select: { userId: true },
				},
			},
		});
		if (!share) return null;
		return PhotoShareViewSchema.parse(this.toPhotoShareView(share, userId));
	}

	async setDownloaded(
		photoShareId: PhotoShareId,
		userId: UserId,
		downloaded: boolean,
	): Promise<void> {
		if (downloaded) {
			await this.prisma.photoDownloadStatus.upsert({
				where: { photoShareId_userId: { photoShareId, userId } },
				create: { photoShareId, userId },
				update: {},
			});
			return;
		}

		await this.prisma.photoDownloadStatus.deleteMany({
			where: { photoShareId, userId },
		});
	}

	private toPhotoShareView(
		share: {
			id: string;
			url: string;
			downloadDeadline: string | null;
			password: string | null;
			note: string | null;
			createdAt: Date;
			updatedAt: Date;
			uploaderUserId: string;
			uploader: { id: string; name: string };
			downloadStatuses: { userId: string }[];
		},
		userId: UserId,
	) {
		return {
			id: share.id,
			url: share.url as PhotoShareUrl,
			downloadDeadline: share.downloadDeadline,
			password: share.password,
			note: share.note,
			uploader: {
				id: share.uploader.id,
				displayName: share.uploader.name,
			},
			downloadedByMe: share.downloadStatuses.length > 0,
			canEdit: share.uploaderUserId === userId,
			createdAt: share.createdAt.toISOString(),
			updatedAt: share.updatedAt.toISOString(),
		};
	}
}
