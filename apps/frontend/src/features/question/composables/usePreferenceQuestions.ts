import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'

export type PreferenceQuestion = {
  id: string;
  question: string;
  deadline: string;
  capacity: number;
}

export const usePreferenceQuestions = () => {
  const questions = ref<PreferenceQuestion[]>([])

  const addQuestion = () => {
    questions.value.push({
      id: uuidv4(),
      question: '',
      deadline: '',
      capacity: 0
    })
  }

  const removeQuestion = (id: string) => {
    questions.value = questions.value.filter(q => q.id !== id)
  }

  const updateQuestion = (id: string, updated: Partial<PreferenceQuestion>) => {
    const index = questions.value.findIndex(q => q.id === id)
    if (index !== -1) {
      questions.value[index] = {
        ...questions.value[index],
        ...updated,
      }
    }
  }

  return {
    questions,
    addQuestion,
    removeQuestion,
    updateQuestion,
  }
}
