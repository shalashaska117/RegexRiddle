<script setup lang="ts">
const props = defineProps<{
  positivesMatched: number;
  totalPositives: number;
  negativesMatched: number;
  totalNegatives: number;
  solved: boolean;
}>();
</script>

<template>
  <span class="attempt-score">
    <span>
      positives
      <span :class="props.positivesMatched === props.totalPositives ? 'ok' : 'muted'"
        >{{ props.positivesMatched }}/{{ props.totalPositives }}</span
      >
    </span>
    <span>
      negatives
      <span :class="props.negativesMatched === props.totalNegatives ? 'ok' : 'muted'"
        >{{ props.negativesMatched }}/{{ props.totalNegatives }}</span
      >
    </span>
    <span :class="props.solved ? 'ok' : 'err'">{{
      props.solved ? "solved" : "not solved"
    }}</span>
  </span>
</template>

<style scoped>
.attempt-score {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.9rem;
}
</style>
