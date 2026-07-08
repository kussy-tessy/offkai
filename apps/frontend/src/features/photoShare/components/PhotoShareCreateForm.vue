<template>
  <section class="rounded-xl border border-teal-100 bg-teal-50/50 p-5">
    <h2 class="text-lg font-semibold text-slate-900">写真を共有する</h2>

    <form class="mt-5 space-y-4" @submit.prevent="submit">
      <MyFormField v-slot="{ id: fieldId }" label="URL" required>
        <MyTextbox
          :id="fieldId"
          type="url"
          :value="url.value"
          :on-change="url.set"
          :error="errors.url"
          maxlength="2048"
          placeholder="https://..."
        />
      </MyFormField>

      <PhotoShareMetadataFields :form="form" show-placeholders />

      <div class="flex justify-end">
        <MyButton type="submit" :loading="creating" :disabled="creating">
          <FontAwesomeIcon :icon="faPlus" class="mr-2" />
          共有する
        </MyButton>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
  import { faPlus } from "@fortawesome/free-solid-svg-icons";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import {
    CreatePhotoShareRequestSchema,
    type CreatePhotoShareResponse,
    type Unbrand,
  } from "@offkai/core";
  import { ref } from "vue";
  import MyButton from "@/common/components/MyButton.vue";
  import MyFormField from "@/common/components/MyFormField.vue";
  import MyTextbox from "@/common/components/MyTextbox.vue";
  import { getApiErrorMessage, useApi, useToast } from "@/common/composables";
  import { usePhotoShareForm } from "../composables";
  import type { PhotoShare } from "../types";
  import PhotoShareMetadataFields from "./PhotoShareMetadataFields.vue";

  const props = defineProps<{
    eventId: string;
    onCreated: (share: PhotoShare) => void;
  }>();

  const { post } = useApi();
  const { success, error } = useToast();
  const creating = ref(false);
  const form = usePhotoShareForm();
  const { url, errors } = form;

  const submit = async () => {
    form.resetErrors();
    const parsed = CreatePhotoShareRequestSchema.safeParse({
      eventId: props.eventId,
      ...form.toCreatePayload(),
    });
    if (!parsed.success) {
      form.applyValidationIssues(parsed.error.issues);
      return;
    }

    creating.value = true;
    try {
      const { eventId: _, ...body } = parsed.data;
      const created = await post<Unbrand<CreatePhotoShareResponse>>(
        `/offkai-event/${props.eventId}/photo-shares`,
        body,
      );
      if (!created) return;

      props.onCreated(created);
      form.reset();
      success("写真を共有しました。");
    } catch (cause) {
      error(getApiErrorMessage(cause, "写真の共有に失敗しました。"));
    } finally {
      creating.value = false;
    }
  };
</script>
