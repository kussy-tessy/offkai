<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-600">回答を横一列に並べています。コピーするとスプレッドシートへそのまま貼り付けられます。</p>
      <MyButton v-if="data?.participants.length" size="sm" @click="copyTable">表をコピー</MyButton>
    </div>
    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">読み込み中…</div>
    <div v-else-if="loadError" class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <p>{{ loadError }}</p><MyButton class="mt-3" color="gray" variant="ghost" size="sm" @click="load">再読み込み</MyButton>
    </div>
    <div v-else-if="!data?.participants.length" class="py-12 text-center text-sm text-gray-400">回答者はいません</div>
    <div v-else class="overflow-x-auto border border-slate-300">
      <table class="min-w-max border-collapse text-sm">
        <thead><tr class="bg-slate-100"><th v-for="h in headers" :key="h.key" class="whitespace-nowrap border border-slate-300 px-2 py-1 text-left">{{ h.label }}</th></tr></thead>
        <tbody><tr v-for="participant in data.participants" :key="participant.userId">
          <td v-for="cell in rowCells(participant)" :key="cell.key" class="whitespace-nowrap border border-slate-300 px-2 py-1 align-top">
            <template v-if="cell.key === 'name'">
              <span>{{ cell.value }}</span>
              <button v-if="data.canEditAnswers" type="button" class="ml-2 text-sky-600 hover:text-sky-800"
                :aria-label="`${participant.displayName}さんの回答を編集`"
                @click="router.push(`/offkai/${eventId}/answers/${participant.userId}/edit`)">
                <FontAwesomeIcon :icon="faPenToSquare" />
              </button>
            </template>
            <template v-else>{{ cell.value }}</template>
          </td>
        </tr></tbody>
      </table>
    </div>
  </section>
</template>
<script setup lang="ts">
import type { GetParticipantAnswerTableResponse, Unbrand } from "@offkai/core";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import MyButton from "@/common/components/MyButton.vue";
import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
const { eventId } = defineProps<{eventId:string}>();
type Data=Unbrand<GetParticipantAnswerTableResponse>; type Participant=Data["participants"][number];
const {get}=useApi(); const {success,error}=useToast();
const router=useRouter();
const loading=ref(true), loadError=ref(""); const data=ref<Data|null>(null);
const headers=computed(()=>data.value ? [
 {key:"name",label:"名前"},
 ...data.value.commitmentQuestions.map(q=>({key:`c-${q.id}`,label:q.question})),
 ...data.value.preferenceQuestions.map(q=>({key:`p-${q.id}`,label:q.question})),
 ...(data.value.askBringingKigurumi?[{key:"kigurumi",label:"連れてくる着ぐるみさん"}]:[])
] : []);
const rowCells=(p:Participant)=>data.value ? [
 {key:"name",value:p.displayName},
 ...data.value.commitmentQuestions.map(q=>({key:`c-${q.id}`,value:p.commitmentAnswers[q.id]==="yes"?"はい":p.commitmentAnswers[q.id]==="no"?"いいえ":""})),
 ...data.value.preferenceQuestions.map(q=>({key:`p-${q.id}`,value:p.preferenceAnswers[q.id]??""})),
 ...(data.value.askBringingKigurumi?[{key:"kigurumi",value:p.bringingKigurumis.map(k=>`${k.character}（${k.title}）`).join(" / ")}]:[])
] : [];
const safe=(value:string)=>{const normalized=value.replace(/[\t\r\n]+/g," ");return /^[=+\-@]/.test(normalized)?`'${normalized}`:normalized};
const copyTable=async()=>{if(!data.value)return;const t=[headers.value.map(h=>safe(h.label)).join("\t"),...data.value.participants.map(p=>rowCells(p).map(c=>safe(c.value)).join("\t"))].join("\n");try{await navigator.clipboard.writeText(t);success("回答表をコピーしました。")}catch(cause){error(getApiErrorMessage(cause,"回答表をコピーできませんでした。"))}};
const load=async()=>{loading.value=true;loadError.value="";try{const result=await get<Data>(`/offkai-event/${eventId}/participant-answer-table`);if(!result)throw new Error("回答表を取得できませんでした。");data.value=result}catch(cause){loadError.value=getApiErrorMessage(cause,"回答表の読み込みに失敗しました。")}finally{loading.value=false}};
onMounted(()=>void load());
</script>
