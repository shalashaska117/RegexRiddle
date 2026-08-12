<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ pattern: string }>();

type TokenKind = "anc" | "cls" | "qua" | "txt";

interface Token {
  text: string;
  kind: TokenKind;
}

// Display-only scan; it approximates regex syntax and must never throw.
function tokenize(pattern: string): Token[] {
  const tokens: Token[] = [];
  let plain = "";

  const flushPlain = () => {
    if (plain) {
      tokens.push({ text: plain, kind: "txt" });
      plain = "";
    }
  };

  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i] as string;

    if (ch === "\\" && i + 1 < pattern.length) {
      flushPlain();
      tokens.push({ text: pattern.slice(i, i + 2), kind: "cls" });
      i += 2;
      continue;
    }

    if (ch === "[") {
      let j = i + 1;
      while (j < pattern.length && pattern[j] !== "]") {
        if (pattern[j] === "\\") j += 1;
        j += 1;
      }
      const end = j < pattern.length ? j + 1 : pattern.length;
      flushPlain();
      tokens.push({ text: pattern.slice(i, end), kind: "cls" });
      i = end;
      continue;
    }

    if (ch === "^" || ch === "$" || ch === "(" || ch === ")" || ch === "|") {
      flushPlain();
      tokens.push({ text: ch, kind: "anc" });
      i += 1;
      continue;
    }

    if (ch === "*" || ch === "+" || ch === "?") {
      flushPlain();
      tokens.push({ text: ch, kind: "qua" });
      i += 1;
      continue;
    }

    if (ch === "{") {
      const rest = pattern.slice(i);
      const m = /^\{\d+(,\d*)?\}/.exec(rest);
      if (m) {
        flushPlain();
        tokens.push({ text: m[0], kind: "qua" });
        i += m[0].length;
        continue;
      }
    }

    plain += ch;
    i += 1;
  }
  flushPlain();
  return tokens;
}

const tokens = computed<Token[]>(() => {
  try {
    return tokenize(props.pattern);
  } catch {
    return [{ text: props.pattern, kind: "txt" }];
  }
});
</script>

<template>
  <span class="regex-text"
    ><span class="tk-del">/</span
    ><span v-for="(token, index) in tokens" :key="index" :class="'tk-' + token.kind">{{
      token.text
    }}</span
    ><span class="tk-del">/</span></span
  >
</template>

<style scoped>
.regex-text {
  font-family: var(--font-mono);
  color: var(--text);
  overflow-wrap: anywhere;
}

.tk-del {
  color: var(--tk-del);
}

.tk-anc {
  color: var(--tk-anc);
}

.tk-cls {
  color: var(--tk-cls);
}

.tk-qua {
  color: var(--tk-qua);
}

.tk-txt {
  color: var(--text);
}
</style>
