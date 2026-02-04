import { Ref } from "vue";

export const useChoices = (choices: Ref<string[]>) => {
	const addChoice = () => {
		choices.value.push("");
	};

	const updateChoice = (index: number, value: string) => {
		if (choices.value[index] !== undefined) {
			choices.value[index] = value;
		}
	};

	const removeChoice = (index: number) => {
		choices.value.splice(index, 1);
	};

	return {
		addChoice,
		updateChoice,
		removeChoice,
	};
};
