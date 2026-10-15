import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../repository/prisma";

let storage: { client: S3Client; bucket: string } | undefined;
function getStorage() {
	if (storage) return storage;
	const endpoint = process.env.R2_ENDPOINT;
	const bucket = process.env.R2_BUCKET_NAME ?? process.env.BUCKET_NAME;
	const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? process.env.ACCESS_KEY_ID;
	const secretAccessKey =
		process.env.R2_SECRET_ACCESS_KEY ?? process.env.SECRET_ACCESS_KEY;
	if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
		throw new Error("R2 storage is not configured");
	}
	storage = {
		bucket,
		client: new S3Client({
			endpoint,
			region: "auto",
			credentials: { accessKeyId, secretAccessKey },
			maxAttempts: 2,
		}),
	};
	return storage;
}

export async function putGuideImage(key: string, body: Buffer) {
	const { client, bucket } = getStorage();
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
			ContentType: "image/webp",
			CacheControl: "private, max-age=300",
		}),
		{ abortSignal: AbortSignal.timeout(60_000) },
	);
}

export async function signGuideImage(key: string) {
	const { client, bucket } = getStorage();
	return getSignedUrl(
		client,
		new GetObjectCommand({ Bucket: bucket, Key: key }),
		{ expiresIn: 300 },
	);
}

let cleaning = false;
export async function cleanGuideImages() {
	if (cleaning) return;
	cleaning = true;
	try {
		const pending = await prisma.r2PendingDeletion.findMany({
			where: { notBefore: { lte: new Date() } },
			take: 50,
			orderBy: { notBefore: "asc" },
		});
		if (!pending.length) return;
		const { client, bucket } = getStorage();
		for (const item of pending) {
			try {
				await client.send(
					new DeleteObjectCommand({ Bucket: bucket, Key: item.objectKey }),
					{ abortSignal: AbortSignal.timeout(10_000) },
				);
				await prisma.r2PendingDeletion.deleteMany({
					where: { objectKey: item.objectKey },
				});
			} catch {
				// Keep the durable queue entry and retry on the next run. Never log credentials.
				console.warn("R2 image cleanup will be retried");
			}
		}
	} finally {
		cleaning = false;
	}
}
