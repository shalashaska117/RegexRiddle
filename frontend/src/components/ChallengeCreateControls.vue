<script setup lang="ts">
const props = defineProps<{
  groupKey: "controlsPositive" | "controlsNegative";
  legend: string;
  rowName: string;
  note: string;
  values: string[];
  errors: Record<string, string>;
}>();

const emit = defineEmits<{
  update: [index: number, value: string];
  add: [];
  remove: [index: number];
}>();

function onInput(index: number, event: Event): void {
  emit("update", index, (event.target as HTMLInputElement).value);
}
</script>

<template>
  <fieldset class="controls">
    <legend class="label">{{ props.legend }}</legend>
    <p class="muted note">{{ props.note }}</p>
    <div v-for="(value, index) in props.values" :key="index" class="row-block">
      <div class="row">
        <input
          class="input mono"
          type="text"
          maxlength="1000"
          autocomplete="off"
          spellcheck="false"
          :aria-label="props.rowName + ' ' + (index + 1)"
          :value="value"
          @input="onInput(index, $event)"
        />
        <button
          type="button"
          class="btn"
          :disabled="props.values.length === 1"
          :aria-label="'Remove ' + props.rowName.toLowerCase() + ' ' + (index + 1)"
          @click="emit('remove', index)"
        >
          Remove
        </button>
      </div>
      <p v-if="props.errors[props.groupKey + '.' + index]" class="error-text row-error">
        {{ props.errors[props.groupKey + "." + index] }}
      </p>
    </div>
    <p v-if="props.errors[props.groupKey]" class="error-text group-error">
      {{ props.errors[props.groupKey] }}
    </p>
    <button
      type="button"
      class="btn add-btn"
      :disabled="props.values.length >= 10"
      @click="emit('add')"
    >
      Add string
    </button>
  </fieldset>
</template>

<style scoped>
.controls {
  border: none;
  margin: 0;
  padding: 0;
}

.controls legend {
  padding: 0;
}

.note {
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.row .input {
  flex: 1;
}

.row-block + .row-block {
  margin-top: 0.5rem;
}

.mono {
  font-family: var(--font-mono);
}

.row-error {
  margin: 0.35rem 0 0;
}

.group-error {
  margin: 0.5rem 0 0;
}

.add-btn {
  margin-top: 0.75rem;
}
</style>
