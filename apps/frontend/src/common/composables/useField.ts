import { ref } from "vue";

export {
	type FieldErrors,
	isEmpty,
	resetFieldErrors,
	useFieldErrorsComposable,
} from "./useFieldErrorsComposable";

export const useField = <T>(initial: T) => {
	const value = ref(initial);
	const set = (newValue: T) => {
		value.value = newValue;
	};
	return { value, set };
};
