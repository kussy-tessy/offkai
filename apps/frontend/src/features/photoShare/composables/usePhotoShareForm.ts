import { useField, useFieldErrorsComposable } from "@/common/composables";

export type PhotoShareMetadataFormValue = {
	downloadDeadline: string;
	password: string;
	note: string;
};

export type PhotoShareFormValue = PhotoShareMetadataFormValue & {
	url: string;
};

type ValidationIssue = {
	path: (string | number)[];
	message: string;
};

const emptyValue = (): PhotoShareFormValue => ({
	url: "",
	downloadDeadline: "",
	password: "",
	note: "",
});

export const usePhotoShareForm = () => {
	const url = useField("");
	const downloadDeadline = useField("");
	const password = useField("");
	const note = useField("");
	const { errors, reset: resetErrors } = useFieldErrorsComposable();

	const initialize = (value: Partial<PhotoShareFormValue> = emptyValue()) => {
		url.set(value.url ?? "");
		downloadDeadline.set(value.downloadDeadline ?? "");
		password.set(value.password ?? "");
		note.set(value.note ?? "");
		resetErrors();
	};

	const reset = () => {
		initialize();
	};

	const toMetadataPayload = () => ({
		downloadDeadline: downloadDeadline.value.value || null,
		password: password.value.value || null,
		note: note.value.value || null,
	});

	const toCreatePayload = () => ({
		url: url.value.value,
		...toMetadataPayload(),
	});

	const applyValidationIssues = (issues: ValidationIssue[]) => {
		resetErrors();
		for (const issue of issues) {
			const field = issue.path[0];
			if (
				typeof field === "string" &&
				["url", "downloadDeadline", "password", "note"].includes(field) &&
				!errors.value[field]
			) {
				errors.value[field] = issue.message;
			}
		}
	};

	return {
		url,
		downloadDeadline,
		password,
		note,
		errors,
		resetErrors,
		initialize,
		reset,
		toCreatePayload,
		toMetadataPayload,
		applyValidationIssues,
	};
};

export type PhotoShareForm = ReturnType<typeof usePhotoShareForm>;
