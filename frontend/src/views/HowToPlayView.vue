<script setup lang="ts">
import RegexText from "../components/RegexText.vue";
</script>

<template>
  <div class="how">
    <h1>How to play</h1>

    <section>
      <h2>What a riddle is</h2>
      <p>
        Every riddle hides a secret regular expression. You get exactly two
        public clues: one example string that matches it and one that does
        not. Everything else about the pattern stays hidden.
      </p>
    </section>

    <section>
      <h2>How attempts are scored</h2>
      <p>
        Write a regex you believe behaves the same way and submit it. The
        server runs it against secret control strings: some that the hidden
        regex matches and some that it does not. You are told how many of each
        kind your regex handled correctly, and nothing else. Handle all of
        them and the riddle is solved.
      </p>
    </section>

    <section>
      <h2>The rules that matter</h2>
      <ul>
        <li>
          Matching is full-string, as if the pattern were anchored:
          <RegexText pattern="colou?r" /> behaves like
          <RegexText pattern="^colou?r$" />.
        </li>
        <li>
          Patterns run under the RE2 engine, so backreferences and lookarounds
          are unsupported.
        </li>
        <li>
          Attempts are unlimited until you solve, but the leaderboard rewards
          solving in fewer.
        </li>
        <li>Authors cannot attempt their own riddles.</li>
      </ul>
    </section>

    <section>
      <h2>How the leaderboard ranks</h2>
      <p>
        Players are ranked by how many riddles they have solved. Ties are
        broken by the lowest average number of attempts per solved riddle.
        The average counts every attempt up to and including the solving one.
      </p>
    </section>
  </div>
</template>

<style scoped>
.how {
  max-width: 65ch;
}

h1 {
  font-size: 1.6rem;
  margin: 0 0 1.5rem;
}

section + section {
  margin-top: 1.75rem;
}

h2 {
  font-size: 1.05rem;
  margin: 0 0 0.5rem;
}

p {
  margin: 0;
}

ul {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.5rem;
}
</style>
