import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'

export type CommitmentQuestion = {
  id: string;
  question: string;
  deadline: string;
  capacity: number;
}

export const useCommitmentQuestions = () => {
  const questions = ref<CommitmentQuestion[]>([])

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

  const updateQuestion = (id: string, updated: Partial<CommitmentQuestion>) => {
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
