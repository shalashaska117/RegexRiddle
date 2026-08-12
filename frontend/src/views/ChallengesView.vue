<script setup lang="ts">
import { onMounted, ref } from "vue";
import { listChallenges } from "../api/challenges";
import type { ChallengeSummary } from "../api/challenges";
import { ApiError } from "../api/client";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();

const challenges = ref<ChallengeSummary[]>([]);
const loading = ref(true);
const error = ref("");

// App copy is English, so dates render in the en locale regardless of browser locale.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    challenges.value = await listChallenges();
  } catch (err) {
    error.value =
      err instanceof ApiError ? err.message : "Could not load the challenges.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="header-row">
    <h1 class="page-title">Challenges</h1>
    <RouterLink to="/challenges/new" class="btn">New challenge</RouterLink>
  </div>

  <p v-if="loading" class="muted" role="status">Loading challenges...</p>

  <div v-else-if="error" class="banner" role="alert">
    <span class="error-text">{{ error }}</span>
    <button type="button" class="btn" @click="load">Retry</button>
  </div>

  <div v-else-if="challenges.length === 0" class="empty">
    <p class="muted">No riddles exist yet.</p>
    <p><RouterLink to="/challenges/new">Create the first one</RouterLink></p>
  </div>

  <ul v-else class="challenge-list">
    <li v-for="c in challenges" :key="c.id">
      <RouterLink :to="`/challenges/${c.id}`" class="card challenge-card">
        <div class="challenge-main">
          <span class="challenge-title">{{ c.title }}</span>
          <span class="challenge-meta">
            <span
              v-if="auth.user && c.author.id === auth.user.id"
              class="by-you"
              >yours</span
            >
            <span v-else class="muted">by {{ c.author.username }}</span>
            <span class="muted">{{ formatDate(c.createdAt) }}</span>
          </span>
        </div>
        <div class="challenge-state">
          <span v-if="c.solvedByMe" class="ok"
            ><span aria-hidden="true">&#10003;</span> solved</span
          >
          <span v-else-if="c.myAttempts > 0" class="muted"
            >{{ c.myAttempts }} {{ c.myAttempts === 1 ? "try" : "tries" }}</span
          >
          <span class="muted"
            >{{ c.solvedCount }}
            {{ c.solvedCount === 1 ? "solver" : "solvers" }}</span
          >
        </div>
      </RouterLink>
    </li>
  </ul>
</template>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.page-title {
  margin: 0;
}

.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--err);
  border-radius: 6px;
  padding: 0.75rem 1rem;
}

.empty {
  text-align: center;
  padding: 3rem 1rem;
}

.challenge-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.challenge-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--text);
  text-decoration: none;
  padding: 0.9rem 1.25rem;
}

.challenge-card:hover {
  border-color: var(--border);
  color: var(--text);
  text-decoration: none;
}

.challenge-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.challenge-title {
  color: var(--text-bright);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.challenge-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  font-size: 0.85rem;
}

.by-you {
  color: var(--accent);
}

.challenge-state {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  font-size: 0.85rem;
  white-space: nowrap;
}
</style>
