import {
	BringingKigurumiSchema,
	type BringingKigurumi,
	type KigurumiId,
} from "@offkai/core";
import { prisma } from "./prisma";

// Resolve against the respondent's own registrations, never trust image references in answer JSON.
export async function resolveBringingKigurumiImages(
	rows: Array<{ userId: string | null; bringingKigurumis: unknown }>,
) {
	const owners = [
		...new Set(rows.flatMap((row) => (row.userId ? [row.userId] : []))),
	];
	const registered = owners.length
		? await prisma.kigurumi.findMany({
				where: { ownerUserId: { in: owners } },
				include: { image: { select: { kigurumiId: true } } },
			})
		: [];
	return rows.map((row) =>
		BringingKigurumiSchema.array()
			.parse(row.bringingKigurumis ?? [])
			.map((snapshot): BringingKigurumi => {
				const match = registered.find(
					(item) =>
						item.ownerUserId === row.userId &&
						(snapshot.kigurumiId
							? item.id === snapshot.kigurumiId
							: item.title === snapshot.title &&
								item.character === snapshot.character),
				);
				return {
					title: snapshot.title,
					character: snapshot.character,
					...(match
						? {
								kigurumiId: match.id as KigurumiId,
								hasImage: Boolean(match.image),
							}
						: {}),
				};
			}),
	);
}
