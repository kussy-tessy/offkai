import type { Primitive, UnionToIntersection } from "type-fest";
import type { BRAND } from "zod";

type IterateOnTuple<T extends [...unknown[]]> = T extends [
	infer Head,
	...infer Tail,
]
	? [Unbrand<Head>, ...IterateOnTuple<Tail>]
	: [];

type RemoveBrand<T> =
	T extends BRAND<infer Brand>
		? T extends (
				| BRAND<Brand>
				| UnionToIntersection<{ [K in Brand]: BRAND<K> }[Brand]>
			) &
				infer X
			? RemoveBrand<X>
			: never
		: T;

/**
 * Recursively removes the brand from T.
 *
 * @see https://github.com/colinhacks/zod/discussions/1994#discussioncomment-6068940
 */
export type Unbrand<T> = T extends Primitive
	? RemoveBrand<T>
	: T extends Promise<infer E>
		? Promise<Unbrand<E>>
		: T extends [unknown, ...unknown[]]
			? IterateOnTuple<RemoveBrand<T>>
			: T extends (infer E)[]
				? Unbrand<E>[]
				: T extends Set<infer E>
					? Set<Unbrand<E>>
					: T extends Map<infer E, infer F>
						? Map<Unbrand<E>, Unbrand<F>>
						: { [K in keyof T as Unbrand<K>]: Unbrand<T[K]> };
