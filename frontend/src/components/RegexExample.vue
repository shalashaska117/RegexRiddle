<script setup lang="ts">
import RegexText from "./RegexText.vue";

const props = defineProps<{
  pattern: string;
  matches: string[];
  nonMatches: string[];
  note?: string;
}>();

const emit = defineEmits<{ try: [pattern: string, subject: string] }>();

// An empty sample would render as nothing at all, so it is named instead.
function label(sample: string): string {
  return sample === "" ? "(the empty string)" : sample;
}

function onTry(): void {
  emit("try", props.pattern, props.matches[0] ?? props.nonMatches[0] ?? "");
}
</script>

<template>
  <div class="example">
    <div class="example-head">
      <p class="example-pattern"><RegexText :pattern="pattern" /></p>
      <button type="button" class="try" @click="onTry">Try it</button>
    </div>
    <ul class="samples">
      <li v-for="sample in matches" :key="`m:${sample}`">
        <span class="mark ok" aria-hidden="true">&#x2713;</span>
        <span class="sample" :class="{ empty: sample === '' }">{{ label(sample) }}</span>
        <span class="sr-only">matches</span>
      </li>
      <li v-for="sample in nonMatches" :key="`n:${sample}`">
        <span class="mark err" aria-hidden="true">&#x2715;</span>
        <span class="sample" :class="{ empty: sample === '' }">{{ label(sample) }}</span>
        <span class="sr-only">does not match</span>
      </li>
    </ul>
    <p v-if="note" class="note muted">{{ note }}</p>
  </div>
</template>

<style scoped>
.example {
  background: var(--panel);
  border: 1px solid var(--hairline);
  border-radius: 6px;
  padding: 0.9rem 1rem;
}

.example-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.example-pattern {
  margin: 0;
}

.try {
  background: transparent;
  border: 0;
  border-bottom: 1px solid transparent;
  color: var(--muted);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  padding: 0;
  text-transform: uppercase;
}

.try:hover {
  border-bottom-color: var(--accent);
  color: var(--accent);
}

.samples {
  list-style: none;
  margin: 0.7rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
}

.samples li {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.mark {
  width: 1rem;
  flex-shrink: 0;
  text-align: center;
}

.sample {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.empty {
  color: var(--muted);
  font-family: var(--font-ui);
  font-style: italic;
}

.note {
  font-size: 0.85rem;
  margin: 0.7rem 0 0;
}
</style>
