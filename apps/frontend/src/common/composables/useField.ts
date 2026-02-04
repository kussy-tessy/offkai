import { type Ref, ref } from "vue";

export type FieldErrors = Record<string, string | undefined>;

export const isEmpty = (value: Ref<string>) => value.value.trim() === "";

export const useField = <T>(initial: T) => {
	const value = ref(initial);
	const set = (newValue: T) => {
		value.value = newValue;
	};
	return { value, set };
};
