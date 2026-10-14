<script setup lang="ts">
import { ref } from "vue";

// A password field with a reveal toggle. Typing a password you cannot read
// is the part of a login that goes wrong most often, and it goes wrong worst
// for the readers this front end is built around.
const props = defineProps<{
  id: string;
  autocomplete: string;
  // names this field in the toggle's accessible name, since a form can hold
  // more than one of them: "password", "new password", "current password"
  label: string;
  describedby?: string;
  invalid?: boolean;
  maxlength?: number;
  required?: boolean;
}>();

const model = defineModel<string>({ required: true });
const revealed = ref(false);

/**
 * Switch between hidden and readable password text.
 * Parameters: none.
 * @returns Nothing; flips the field's visibility state.
 */
function toggle(): void {
  revealed.value = !revealed.value;
}
</script>

<template>
  <div class="password-field">
    <input
      :id="props.id"
      v-model="model"
      class="input password-input"
      :type="revealed ? 'text' : 'password'"
      :autocomplete="props.autocomplete"
      :required="props.required"
      :maxlength="props.maxlength"
      :aria-invalid="props.invalid ? 'true' : undefined"
      :aria-describedby="props.describedby"
      spellcheck="false"
      autocapitalize="off"
    />
    <button
      type="button"
      class="reveal"
      :aria-pressed="revealed"
      :aria-controls="props.id"
      :aria-label="`${revealed ? 'Hide' : 'Show'} ${props.label}`"
      @click="toggle"
    >
      {{ revealed ? "Hide" : "Show" }}
    </button>
  </div>
</template>

<style scoped>
.password-field {
  position: relative;
}

/* room for the toggle; in rem, so it grows with the text size setting */
.password-input {
  padding-right: 4.4rem;
}

.reveal {
  position: absolute;
  right: 1px;
  top: 1px;
  bottom: 1px;
  background: transparent;
  border: 0;
  border-left: 1px solid var(--border);
  border-radius: 0 4px 4px 0;
  color: var(--muted);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  padding: 0 0.7rem;
  text-transform: uppercase;
}

.reveal:hover {
  color: var(--accent);
}

.reveal[aria-pressed="true"] {
  color: var(--accent);
}
</style>
