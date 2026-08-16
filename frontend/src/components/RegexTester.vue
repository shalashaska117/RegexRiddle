<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { testPattern } from "../api/regex";
import { ApiError } from "../api/client";
import RegexText from "./RegexText.vue";

const pattern = ref("");
const subject = ref("");
const verdict = ref<"match" | "no-match" | null>(null);
const errorText = ref("");
const pending = ref(false);
const patternInput = ref<HTMLInputElement | null>(null);

const DEBOUNCE_MS = 500;
let timer: number | undefined;
// Answers can arrive out of order; only the newest request may write the
// result.
let latest = 0;

async function run(): Promise<void> {
  window.clearTimeout(timer);
  const currentPattern = pattern.value;
  if (currentPattern === "") {
    latest += 1;
    verdict.value = null;
    errorText.value = "";
    pending.value = false;
    return;
  }
  const ticket = (latest += 1);
  pending.value = true;
  try {
    const { matches } = await testPattern(currentPattern, subject.value);
    if (ticket !== latest) return;
    verdict.value = matches ? "match" : "no-match";
    errorText.value = "";
  } catch (err) {
    if (ticket !== latest) return;
    verdict.value = null;
    if (err instanceof ApiError) {
      errorText.value =
        err.status === 429
          ? "Too many checks, wait a minute."
          : (err.fieldErrors.pattern ?? err.fieldErrors.subject ?? err.message);
    } else {
      errorText.value = "The check failed. Try again.";
    }
  } finally {
    if (ticket === latest) pending.value = false;
  }
}

watch([pattern, subject], () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void run(), DEBOUNCE_MS);
});

onBeforeUnmount(() => window.clearTimeout(timer));

// Called by the tutorial page when a reader picks an example. The watcher
// above fires first and queues a delayed run, so this waits for it and then
// runs straight away instead.
async function load(nextPattern: string, nextSubject: string): Promise<void> {
  pattern.value = nextPattern;
  subject.value = nextSubject;
  await nextTick();
  patternInput.value?.focus();
  await run();
}

defineExpose({ load });
</script>

<template>
  <section class="tester card" aria-labelledby="tester-heading">
    <h2 id="tester-heading" class="tester-title">Try a pattern</h2>
    <p class="tester-intro muted">
      Checked on the server by the same engine that scores attempts, so the
      answer here is the answer a riddle would give. Matching is full-string.
    </p>
    <form class="tester-form" novalidate @submit.prevent="run">
      <div class="field">
        <label class="label" for="tester-pattern">Pattern</label>
        <input
          id="tester-pattern"
          ref="patternInput"
          v-model="pattern"
          class="input mono"
          type="text"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          maxlength="500"
          placeholder="colou?r"
        />
      </div>
      <div class="field">
        <label class="label" for="tester-subject">String to test</label>
        <input
          id="tester-subject"
          v-model="subject"
          class="input mono"
          type="text"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          maxlength="1000"
          placeholder="colour"
        />
      </div>
      <div class="tester-actions">
        <button type="submit" class="btn" :disabled="pattern === ''">Test</button>
        <p id="tester-result" class="result" role="status" aria-live="polite">
          <template v-if="errorText">
            <span class="mark err" aria-hidden="true">&#x2715;</span>
            <span class="err">{{ errorText }}</span>
          </template>
          <template v-else-if="pending">
            <span class="muted">Checking&hellip;</span>
          </template>
          <template v-else-if="verdict === 'match'">
            <span class="mark ok" aria-hidden="true">&#x2713;</span>
            <span class="ok">
              <RegexText :pattern="pattern" /> matches this string.
            </span>
          </template>
          <template v-else-if="verdict === 'no-match'">
            <span class="mark err" aria-hidden="true">&#x2715;</span>
            <span class="err">
              <RegexText :pattern="pattern" /> does not match this string.
            </span>
          </template>
          <template v-else>
            <span class="muted">Type a pattern to test it.</span>
          </template>
        </p>
      </div>
    </form>
  </section>
</template>

<style scoped>
.tester-title {
  font-size: 1rem;
  margin: 0 0 0.4rem;
}

.tester-intro {
  font-size: 0.85rem;
  margin: 0 0 1rem;
  max-width: 48ch;
}

.tester-form {
  display: grid;
  gap: 0.9rem;
}

@media (min-width: 40rem) {
  .tester-form {
    grid-template-columns: 1fr 1fr;
  }

  .tester-actions {
    grid-column: 1 / -1;
  }
}

.mono {
  font-family: var(--font-mono);
}

.tester-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
}

.result {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.9rem;
  margin: 0;
  /* holds one line of height so the layout does not jump between states */
  min-height: 1.4em;
}

.mark {
  flex-shrink: 0;
}
</style>
