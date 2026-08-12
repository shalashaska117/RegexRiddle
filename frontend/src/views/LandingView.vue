<script setup lang="ts">
import RegexText from "../components/RegexText.vue";
</script>

<template>
  <div class="landing">
    <section class="hero">
      <p class="hero-regex" aria-hidden="true">
        <RegexText pattern="^#[0-9a-f]{6}$" /><span class="caret">|</span>
      </p>
      <h1>Crack the pattern.</h1>
      <p class="subtitle">
        Each riddle hides a secret regex. Guess it from the way it judges your
        tries.
      </p>
      <ul class="evidence">
        <li>
          <span class="mark ok" aria-hidden="true">&#x2713;</span>
          <span class="sample">#1abc9c</span>
          <span class="sr-only">matches</span>
        </li>
        <li>
          <span class="mark err" aria-hidden="true">&#x2715;</span>
          <span class="sample">1abc9c</span>
          <span class="sr-only">does not match</span>
        </li>
      </ul>
      <div class="ctas">
        <RouterLink to="/challenges" class="btn">Browse challenges</RouterLink>
        <RouterLink to="/how-to-play" class="quiet-link">How to play</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  max-width: 34rem;
  margin: 0 auto;
  padding-top: 3rem;
  text-align: center;
}

.hero-regex {
  font-size: 1.3rem;
  margin: 0 0 1.75rem;
}

h1 {
  font-size: 2.2rem;
  margin: 0 0 0.6rem;
}

.subtitle {
  color: var(--muted);
  margin: 0 0 2rem;
}

.evidence {
  list-style: none;
  display: inline-flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0 0 2rem;
  padding: 0.9rem 1.4rem;
  background: var(--panel);
  border: 1px solid var(--hairline);
  border-radius: 6px;
  text-align: left;
}

.evidence li {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}

.mark {
  width: 1rem;
  text-align: center;
}

.sample {
  font-family: var(--font-mono);
}

.ctas {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
}

.quiet-link {
  color: var(--muted);
  font-size: 0.85rem;
}

.quiet-link:hover {
  color: var(--text);
}
</style>
