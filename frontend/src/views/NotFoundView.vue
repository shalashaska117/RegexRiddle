<script setup lang="ts">
import RegexText from "../components/RegexText.vue";
</script>

<template>
  <div class="not-found">
    <p class="code" aria-hidden="true"><RegexText pattern="^404$" /></p>
    <h1 class="title">Page not found</h1>
    <p class="muted">This address matches no route.</p>
    <nav class="links" aria-label="Leave this page">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/challenges">Challenges</RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  padding: 3rem 0;
}

.code {
  font-size: 2.2rem;
  margin: 0;
}

.title {
  font-size: 1.3rem;
  margin: 0;
}

.not-found p {
  margin: 0;
}

.links {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
}
</style>
