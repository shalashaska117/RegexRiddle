<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getLeaderboard } from "../api/leaderboard";
import type { LeaderboardRow } from "../api/leaderboard";
import { ApiError } from "../api/client";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();

const rows = ref<LeaderboardRow[]>([]);
const loading = ref(true);
const error = ref("");

/**
 * Fetch the current ranking for the leaderboard.
 * Parameters: none.
 * @returns Promise that resolves without a value after updating rows or the error state.
 */
async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    rows.value = await getLeaderboard();
  } catch (err: unknown) {
    error.value =
      err instanceof ApiError ? err.message : "Could not load the leaderboard.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <h1>Leaderboard</h1>
  <p class="muted intro">
    Players are ranked by riddles solved; ties are broken by the lowest average
    number of attempts to the first solve.
  </p>

  <p v-if="loading" class="muted" role="status">Loading the leaderboard...</p>

  <div v-else-if="error" class="banner" role="alert">
    <p class="error-text banner-text">{{ error }}</p>
    <button type="button" class="btn" @click="load">Retry</button>
  </div>

  <p v-else-if="rows.length === 0" class="muted">
    Nobody has solved a riddle yet.
  </p>

  <div v-else class="table-scroll">
    <table class="board">
      <thead>
        <tr>
          <th scope="col" class="num">Rank</th>
          <th scope="col">Player</th>
          <th scope="col" class="num">Solved</th>
          <th scope="col" class="num">Avg attempts</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.user.id"
          :class="{ me: row.user.id === auth.user?.id }"
        >
          <td class="num rank" :class="{ top: row.rank <= 3 }">
            {{ row.rank }}
          </td>
          <td>
            <span class="player">
              <img
                v-if="row.user.avatarUrl"
                :src="row.user.avatarUrl"
                alt=""
                class="avatar"
              />
              <span v-else class="avatar avatar-letter" aria-hidden="true">{{
                row.user.username[0]
              }}</span>
              <span>{{ row.user.username }}</span>
            </span>
          </td>
          <td class="num">{{ row.solvedCount }}</td>
          <td class="num">{{ row.avgAttempts.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.intro {
  margin-top: 0.25rem;
}

.banner {
  background: var(--panel);
  border: 1px solid var(--err);
  border-radius: 6px;
  padding: 0.6rem 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.banner-text {
  margin: 0;
}

.table-scroll {
  overflow-x: auto;
  background: var(--panel);
  border: 1px solid var(--hairline);
  border-radius: 6px;
}

.board {
  width: 100%;
  min-width: 28rem;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.board th,
.board td {
  padding: 0.55rem 1rem;
  text-align: left;
  border-top: 1px solid var(--hairline);
}

.board thead th {
  border-top: none;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Transparent placeholder keeps column widths stable when the own-row accent border shows. */
.board th:first-child,
.board td:first-child {
  border-left: 1px solid transparent;
}

tr.me td:first-child {
  border-left-color: var(--accent);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.rank.top {
  color: var(--accent);
}

.player {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.avatar-letter {
  background: var(--inset);
  border: 1px solid var(--border);
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  text-transform: uppercase;
}
</style>
