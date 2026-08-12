<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AttemptScore from "../components/AttemptScore.vue";
import RegexText from "../components/RegexText.vue";
import {
  getChallenge,
  submitAttempt,
  type AttemptHistoryEntry,
  type AttemptResult,
  type ChallengeDetail,
} from "../api/challenges";
import { ApiError } from "../api/client";
import { useAuthStore } from "../stores/auth";

const route = useRoute();
const auth = useAuthStore();

const challenge = ref<ChallengeDetail | null>(null);
const attempts = ref<AttemptHistoryEntry[]>([]);
const solved = ref(false);
const loading = ref(true);
const notFound = ref(false);
const loadError = ref("");

const pattern = ref("");
const patternError = ref("");
const submitError = ref("");
const pending = ref(false);
const lastResult = ref<AttemptResult | null>(null);

const isAuthor = computed(
  () =>
    challenge.value !== null &&
    auth.user !== null &&
    challenge.value.author.id === auth.user.id,
);

const solvedIn = computed<number | null>(() => {
  const index = attempts.value.findIndex((attempt) => attempt.solved);
  return index === -1 ? null : index + 1;
});

async function load(): Promise<void> {
  loading.value = true;
  notFound.value = false;
  loadError.value = "";
  challenge.value = null;
  attempts.value = [];
  solved.value = false;
  pattern.value = "";
  patternError.value = "";
  submitError.value = "";
  lastResult.value = null;

  const id = Number(route.params.id);
  if (!Number.isInteger(id) || id < 1) {
    notFound.value = true;
    loading.value = false;
    return;
  }

  try {
    const detail = await getChallenge(id);
    challenge.value = detail;
    attempts.value = [...detail.myAttempts];
    solved.value = detail.solvedByMe;
    document.title = `${detail.title} - RegexRiddle`;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound.value = true;
    } else {
      loadError.value =
        err instanceof Error ? err.message : "Could not load this riddle.";
    }
  } finally {
    loading.value = false;
  }
}

// params.id turns undefined while leaving the route; skip that final trigger.
watch(
  () => route.params.id,
  (id) => {
    if (id !== undefined) void load();
  },
  { immediate: true },
);

async function onSubmit(): Promise<void> {
  if (!challenge.value || pending.value || pattern.value.length === 0) return;
  patternError.value = "";
  submitError.value = "";
  pending.value = true;
  try {
    const result = await submitAttempt(challenge.value.id, pattern.value);
    lastResult.value = result;
    attempts.value.push({
      proposedRegex: pattern.value,
      positivesMatched: result.positivesMatched,
      negativesMatched: result.negativesMatched,
      solved: result.solved,
      // The submit response carries no timestamp; the client clock stands in.
      createdAt: new Date().toISOString(),
    });
    if (result.solved) solved.value = true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      const serverMessage = err.fieldErrors["regex"] ?? err.message;
      patternError.value = `The engine rejected this pattern: ${serverMessage}`;
    } else if (err instanceof ApiError && err.status === 409) {
      // Already solved, e.g. in another tab; show the solved state.
      solved.value = true;
    } else if (err instanceof ApiError && err.status === 429) {
      submitError.value = "Too many attempts, wait a minute.";
    } else {
      submitError.value =
        err instanceof Error ? err.message : "Could not submit the attempt.";
    }
  } finally {
    pending.value = false;
  }
}

// App copy is English, so dates render in the en locale regardless of browser locale.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <p v-if="loading" class="muted" role="status">Loading riddle...</p>

  <div v-else-if="notFound" class="card not-found">
    <p class="muted">This riddle does not exist.</p>
    <RouterLink to="/challenges">Back to challenges</RouterLink>
  </div>

  <div v-else-if="loadError" class="load-error">
    <p class="banner" role="alert">{{ loadError }}</p>
    <button type="button" class="btn" @click="load">Retry</button>
  </div>

  <div v-else-if="challenge" class="detail">
    <header>
      <h1 class="title">{{ challenge.title }}</h1>
      <p class="byline muted">
        by {{ challenge.author.username }} on
        {{ formatDate(challenge.createdAt) }}
      </p>
    </header>

    <section class="card">
      <h2 class="section-title">Examples</h2>
      <ul class="example-list">
        <li class="example-row">
          <span class="mark ok" aria-hidden="true">&#x2713;</span>
          <span class="example-label muted">matches</span>
          <span class="example-string">{{ challenge.examplePositive }}</span>
        </li>
        <li class="example-row">
          <span class="mark err" aria-hidden="true">&#x2715;</span>
          <span class="example-label muted">does not match</span>
          <span class="example-string">{{ challenge.exampleNegative }}</span>
        </li>
      </ul>
      <p class="control-note muted">
        scored against {{ challenge.controlCounts.positive }} positive and
        {{ challenge.controlCounts.negative }} negative secret strings
      </p>
    </section>

    <section v-if="isAuthor" class="card">
      <p class="state-note muted">
        This is your riddle. Authors cannot attempt it.
      </p>
    </section>

    <section v-else-if="solved" class="card">
      <p class="solved-banner" role="status">
        <span aria-hidden="true">&#x2713;</span>
        <span v-if="solvedIn === null">Solved.</span>
        <span v-else
          >Solved in {{ solvedIn }}
          {{ solvedIn === 1 ? "attempt" : "attempts" }}.</span
        >
      </p>
    </section>

    <section v-else class="card">
      <h2 class="section-title">Your attempt</h2>
      <form class="attempt-form" @submit.prevent="onSubmit" novalidate>
        <div>
          <label class="label" for="pattern-input">Pattern</label>
          <input
            id="pattern-input"
            v-model="pattern"
            class="input pattern-input"
            type="text"
            maxlength="500"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :aria-invalid="patternError ? 'true' : undefined"
            :aria-describedby="patternError ? 'pattern-error' : undefined"
          />
          <p v-if="pattern" class="pattern-preview">
            <RegexText :pattern="pattern" />
          </p>
          <p v-if="patternError" id="pattern-error" class="error-text">
            {{ patternError }}
          </p>
        </div>
        <p v-if="submitError" class="banner" role="alert">{{ submitError }}</p>
        <div class="form-actions">
          <button
            type="submit"
            class="btn"
            :disabled="pending || pattern.length === 0"
          >
            Submit
          </button>
          <span aria-live="polite">
            <AttemptScore
              v-if="lastResult"
              :positives-matched="lastResult.positivesMatched"
              :total-positives="lastResult.totalPositives"
              :negatives-matched="lastResult.negativesMatched"
              :total-negatives="lastResult.totalNegatives"
              :solved="lastResult.solved"
            />
          </span>
        </div>
      </form>
    </section>

    <section v-if="attempts.length > 0" class="card">
      <h2 class="section-title">Attempt history</h2>
      <ol class="attempt-list">
        <li
          v-for="(attempt, index) in attempts"
          :key="index"
          class="attempt-row"
        >
          <span class="attempt-number muted">#{{ index + 1 }}</span>
          <span class="attempt-pattern">
            <RegexText :pattern="attempt.proposedRegex" />
          </span>
          <span class="attempt-counts">
            <span>
              positives
              <span
                :class="
                  attempt.positivesMatched === challenge.controlCounts.positive
                    ? 'ok'
                    : 'muted'
                "
                >{{ attempt.positivesMatched }}/{{
                  challenge.controlCounts.positive
                }}</span
              >
            </span>
            <span>
              negatives
              <span
                :class="
                  attempt.negativesMatched === challenge.controlCounts.negative
                    ? 'ok'
                    : 'muted'
                "
                >{{ attempt.negativesMatched }}/{{
                  challenge.controlCounts.negative
                }}</span
              >
            </span>
          </span>
          <span class="attempt-date muted">{{
            formatDateTime(attempt.createdAt)
          }}</span>
          <span v-if="attempt.solved" class="mark ok">
            <span aria-hidden="true">&#x2713;</span>
            <span class="sr-only">solving attempt</span>
          </span>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.title {
  font-size: 1.6rem;
  margin: 0;
}

.byline {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
}

.section-title {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 0.85rem;
}

.example-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.example-row {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}

.mark {
  width: 1rem;
  text-align: center;
  flex-shrink: 0;
}

.example-label {
  font-size: 0.85rem;
  width: 7.5rem;
  flex-shrink: 0;
}

.example-string {
  font-family: var(--font-mono);
  background: var(--inset);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0.15rem 0.5rem;
  min-height: 1.5rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.control-note {
  margin: 0.85rem 0 0;
  font-size: 0.85rem;
}

.state-note {
  margin: 0;
}

.solved-banner {
  color: var(--ok);
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.attempt-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.pattern-input {
  font-family: var(--font-mono);
}

.pattern-preview {
  margin: 0.5rem 0 0;
}

.error-text {
  margin: 0.35rem 0 0;
}

.banner {
  border: 1px solid var(--err);
  border-radius: 5px;
  color: var(--err);
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  margin: 0;
}

.load-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.85rem;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.not-found p {
  margin: 0;
}

.attempt-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.attempt-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 1rem;
  padding: 0.6rem 0;
  border-top: 1px solid var(--hairline);
}

.attempt-row:first-child {
  border-top: none;
  padding-top: 0;
}

.attempt-row:last-child {
  padding-bottom: 0;
}

.attempt-number {
  font-size: 0.85rem;
  min-width: 2rem;
}

.attempt-pattern {
  flex: 1 1 12rem;
  min-width: 0;
}

.attempt-counts {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.attempt-date {
  font-size: 0.85rem;
}
</style>
