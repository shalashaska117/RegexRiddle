<script setup lang="ts">
import { computed } from "vue";
import { PASSWORD_RULES } from "../lib/password";

// The id lets the password input point at this list with aria-describedby,
// so a screen reader reads the requirements when the field takes focus.
const props = defineProps<{ id: string; password: string }>();

interface RuleState {
  id: string;
  label: string;
  met: boolean;
  // before the first keystroke nothing is marked as failed; an untouched
  // field is not a wrong one
  pending: boolean;
  mark: string;
}

const rules = computed<RuleState[]>(() => {
  const untouched = props.password === "";
  return PASSWORD_RULES.map((rule) => {
    const met = rule.met(props.password);
    const pending = untouched && !met;
    // middle dot, check mark, multiplication x
    const mark = pending ? "·" : met ? "✓" : "✕";
    return { id: rule.id, label: rule.label, met, pending, mark };
  });
});
</script>

<template>
  <ul :id="id" class="rules">
    <li
      v-for="rule in rules"
      :key="rule.id"
      class="rule"
      :class="rule.pending ? 'muted' : rule.met ? 'ok' : 'err'"
    >
      <span class="mark" aria-hidden="true">{{ rule.mark }}</span>
      <span>{{ rule.label }}</span>
      <span v-if="!rule.pending" class="sr-only">{{
        rule.met ? "met" : "missing"
      }}</span>
    </li>
  </ul>
</template>

<style scoped>
.rules {
  list-style: none;
  margin: 0.4rem 0 0;
  padding: 0;
  font-size: 0.8rem;
  display: grid;
  gap: 0.15rem;
}

.rule {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.mark {
  width: 0.8rem;
  text-align: center;
  flex-shrink: 0;
}
</style>
