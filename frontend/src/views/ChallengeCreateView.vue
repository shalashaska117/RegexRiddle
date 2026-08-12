<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError } from "../api/client";
import { createChallenge } from "../api/challenges";
import RegexText from "../components/RegexText.vue";
import ChallengeCreateControls from "../components/ChallengeCreateControls.vue";

type ControlsKey = "controlsPositive" | "controlsNegative";

const router = useRouter();

const title = ref("");
const regex = ref("");
const examplePositive = ref("");
const exampleNegative = ref("");
const controlsPositive = ref<string[]>([""]);
const controlsNegative = ref<string[]>([""]);

const fieldErrors = ref<Record<string, string>>({});
const banner = ref("");
const pending = ref(false);

function listFor(key: ControlsKey) {
  return key === "controlsPositive" ? controlsPositive : controlsNegative;
}

function clearError(key: string): void {
  delete fieldErrors.value[key];
}

function onControlUpdate(key: ControlsKey, index: number, value: string): void {
  listFor(key).value[index] = value;
  clearError(`${key}.${index}`);
  clearError(key);
}

function onControlAdd(key: ControlsKey): void {
  const list = listFor(key);
  if (list.value.length < 10) list.value.push("");
  clearError(key);
}

function onControlRemove(key: ControlsKey, index: number): void {
  const list = listFor(key);
  if (list.value.length <= 1) return;
  list.value.splice(index, 1);
  // Removal shifts row indices, so indexed errors for this group are stale.
  for (const errorKey of Object.keys(fieldErrors.value)) {
    if (errorKey.startsWith(`${key}.`)) clearError(errorKey);
  }
}

function validate(): Record<string, string> {
  const errors: Record<string, string> = {};
  const trimmedTitle = title.value.trim();
  if (trimmedTitle.length === 0) errors.title = "Enter a title.";
  else if (trimmedTitle.length > 100) {
    errors.title = "Keep the title at 100 characters or fewer.";
  }
  if (regex.value.length === 0) errors.regex = "Enter the secret regex.";
  else if (regex.value.length > 500) {
    errors.regex = "Keep the regex at 500 characters or fewer.";
  }
  if (examplePositive.value.length > 1000) {
    errors.examplePositive = "Keep the example at 1000 characters or fewer.";
  }
  if (exampleNegative.value.length > 1000) {
    errors.exampleNegative = "Keep the example at 1000 characters or fewer.";
  }
  for (const key of ["controlsPositive", "controlsNegative"] as const) {
    listFor(key).value.forEach((value, index) => {
      if (value.length > 1000) {
        errors[`${key}.${index}`] = "Keep each control at 1000 characters or fewer.";
      }
    });
  }
  return errors;
}

function isInlineKey(key: string): boolean {
  const known = [
    "title",
    "regex",
    "examplePositive",
    "exampleNegative",
    "controlsPositive",
    "controlsNegative",
  ];
  if (known.includes(key)) return true;
  const match = /^(controlsPositive|controlsNegative)\.(\d+)$/.exec(key);
  if (match === null) return false;
  return Number(match[2]) < listFor(match[1] as ControlsKey).value.length;
}

async function onSubmit(): Promise<void> {
  banner.value = "";
  fieldErrors.value = validate();
  if (Object.keys(fieldErrors.value).length > 0) return;
  pending.value = true;
  try {
    const created = await createChallenge({
      title: title.value.trim(),
      regex: regex.value,
      examplePositive: examplePositive.value,
      exampleNegative: exampleNegative.value,
      controlsPositive: [...controlsPositive.value],
      controlsNegative: [...controlsNegative.value],
    });
    await router.push(`/challenges/${created.id}`);
  } catch (error) {
    if (error instanceof ApiError) {
      const inline: Record<string, string> = {};
      const rest: string[] = [];
      for (const [key, message] of Object.entries(error.fieldErrors)) {
        if (isInlineKey(key)) inline[key] = message;
        else rest.push(message);
      }
      fieldErrors.value = inline;
      if (rest.length > 0) banner.value = rest.join(" ");
      else if (Object.keys(inline).length === 0) banner.value = error.message;
    } else {
      banner.value = "The request failed. Check your connection and try again.";
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <h1>New challenge</h1>
  <form class="create-form" novalidate @submit.prevent="onSubmit">
    <p v-if="banner" class="banner error-text" role="alert">{{ banner }}</p>

    <div class="field">
      <label class="label" for="cc-title">Title</label>
      <input
        id="cc-title"
        v-model="title"
        class="input"
        type="text"
        maxlength="100"
        autocomplete="off"
        @input="clearError('title')"
      />
      <p v-if="fieldErrors.title" class="error-text field-error">
        {{ fieldErrors.title }}
      </p>
    </div>

    <div class="field">
      <label class="label" for="cc-regex">Secret regex</label>
      <input
        id="cc-regex"
        v-model="regex"
        class="input mono"
        type="text"
        maxlength="500"
        autocomplete="off"
        spellcheck="false"
        @input="clearError('regex')"
      />
      <p v-if="fieldErrors.regex" class="error-text field-error">
        {{ fieldErrors.regex }}
      </p>
      <p v-if="regex" class="preview"><RegexText :pattern="regex" /></p>
      <p class="muted note">
        Patterns run under RE2, so backreferences and lookarounds are unsupported, and
        matching is always full-string.
      </p>
    </div>

    <hr class="sep" />

    <div class="field">
      <label class="label" for="cc-example-positive">Public example that matches</label>
      <input
        id="cc-example-positive"
        v-model="examplePositive"
        class="input mono"
        type="text"
        maxlength="1000"
        autocomplete="off"
        spellcheck="false"
        @input="clearError('examplePositive')"
      />
      <p v-if="fieldErrors.examplePositive" class="error-text field-error">
        {{ fieldErrors.examplePositive }}
      </p>
    </div>

    <div class="field">
      <label class="label" for="cc-example-negative">Public example that does not</label>
      <input
        id="cc-example-negative"
        v-model="exampleNegative"
        class="input mono"
        type="text"
        maxlength="1000"
        autocomplete="off"
        spellcheck="false"
        @input="clearError('exampleNegative')"
      />
      <p v-if="fieldErrors.exampleNegative" class="error-text field-error">
        {{ fieldErrors.exampleNegative }}
      </p>
    </div>

    <hr class="sep" />

    <ChallengeCreateControls
      group-key="controlsPositive"
      legend="Positive controls"
      row-name="Positive control"
      note="These stay secret and score attempts: a solver's regex must match every one of them."
      :values="controlsPositive"
      :errors="fieldErrors"
      @update="(index, value) => onControlUpdate('controlsPositive', index, value)"
      @add="onControlAdd('controlsPositive')"
      @remove="(index) => onControlRemove('controlsPositive', index)"
    />

    <hr class="sep" />

    <ChallengeCreateControls
      group-key="controlsNegative"
      legend="Negative controls"
      row-name="Negative control"
      note="These stay secret and score attempts: a solver's regex must match none of them."
      :values="controlsNegative"
      :errors="fieldErrors"
      @update="(index, value) => onControlUpdate('controlsNegative', index, value)"
      @add="onControlAdd('controlsNegative')"
      @remove="(index) => onControlRemove('controlsNegative', index)"
    />

    <hr class="sep" />

    <button type="submit" class="btn" :disabled="pending">Create challenge</button>
  </form>
</template>

<style scoped>
.create-form {
  max-width: 36rem;
}

.field {
  margin-bottom: 1rem;
}

.mono {
  font-family: var(--font-mono);
}

.field-error {
  margin: 0.35rem 0 0;
}

.preview {
  margin: 0.4rem 0 0;
  overflow-wrap: anywhere;
}

.note {
  font-size: 0.85rem;
  margin: 0.4rem 0 0;
}

.sep {
  border: none;
  border-top: 1px solid var(--hairline);
  margin: 1.4rem 0;
}

.banner {
  border: 1px solid var(--err);
  border-radius: 5px;
  padding: 0.5rem 0.75rem;
  margin: 0 0 1.25rem;
}
</style>
