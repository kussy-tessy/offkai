import { type MaybeRef, type Ref, ref, unref } from "vue";

export type FieldErrors = Record<string, string | undefined>;

export const isEmpty = (value: MaybeRef<string>) => unref(value).trim() === "";

export const resetFieldErrors = (errors: Ref<FieldErrors>) => {
	for (const key of Object.keys(errors.value)) {
		delete errors.value[key];
	}
};

export const useFieldErrorsComposable = () => {
	const errors = ref<FieldErrors>({});

	const reset = () => {
		resetFieldErrors(errors);
	};

	const set = (key: string, message: string | undefined) => {
		if (message === undefined) {
			delete errors.value[key];
			return;
		}

		errors.value[key] = message;
	};

	const hasAny = () => Object.keys(errors.value).length > 0;

	return {
		errors,
		reset,
		set,
		hasAny,
	};
};
