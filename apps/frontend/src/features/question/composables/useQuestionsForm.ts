import { ref } from "vue"
import { useCommitmentQuestions } from "./useCommitmentQuestions"
import { usePreferenceQuestions } from "./usePreferenceQuestions"

export const useQuestionsForm = () => {
  const title = ref("")
  const date = ref<Date | null>(null)
  const description = ref("")

  // 子フォーム（サブコレクション）
  const commitment = useCommitmentQuestions()
  const preference = usePreferenceQuestions()

  const toPayload = () => ({
    title: title.value,
    date: date.value,
    description: description.value,
    commitmentQuestions: commitment.questions.value,
    preferenceQuestions: preference.questions.value,
  })

  return {
    title,
    date,
    description,
    commitment,
    preference,
    toPayload,
  }
}
