<script setup lang="ts">
import { ref } from "vue";
import { TUTORIAL_SECTIONS } from "../lib/tutorial";
import RegexExample from "../components/RegexExample.vue";
import RegexTester from "../components/RegexTester.vue";
import RegexText from "../components/RegexText.vue";

const tester = ref<InstanceType<typeof RegexTester> | null>(null);
const testerAnchor = ref<HTMLElement | null>(null);

// Loading an example moves focus into the tester, which is above the
// examples, so the page has to follow.
async function onTry(pattern: string, subject: string): Promise<void> {
  testerAnchor.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  await tester.value?.load(pattern, subject);
}
</script>

<template>
  <div class="tutorial">
    <h1>Learn regex</h1>
    <p class="lead">
      Everything RegexRiddle accepts, in the order it makes sense to learn it.
      Each example can be loaded into the tester, and the tester runs on the
      server, so nothing here can disagree with the way a riddle is scored.
    </p>

    <nav class="contents" aria-labelledby="contents-heading">
      <h2 id="contents-heading" class="contents-title">On this page</h2>
      <ol>
        <li v-for="section in TUTORIAL_SECTIONS" :key="section.id">
          <a :href="`#${section.id}`">{{ section.title }}</a>
        </li>
      </ol>
    </nav>

    <div ref="testerAnchor">
      <RegexTester ref="tester" />
    </div>

    <section
      v-for="section in TUTORIAL_SECTIONS"
      :id="section.id"
      :key="section.id"
      class="section"
      :aria-labelledby="`${section.id}-heading`"
    >
      <h2 :id="`${section.id}-heading`">{{ section.title }}</h2>
      <p v-for="(paragraph, index) in section.paragraphs" :key="index">
        {{ paragraph }}
      </p>

      <table v-if="section.syntax" class="syntax">
        <caption class="sr-only">
          Syntax for {{ section.title.toLowerCase() }}
        </caption>
        <tbody>
          <tr v-for="row in section.syntax" :key="row.token">
            <th scope="row"><code>{{ row.token }}</code></th>
            <td>{{ row.meaning }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="section.examples" class="examples">
        <RegexExample
          v-for="example in section.examples"
          :key="example.pattern"
          :pattern="example.pattern"
          :matches="example.matches"
          :non-matches="example.nonMatches"
          :note="example.note"
          @try="onTry"
        />
      </div>

      <ul v-if="section.rejected" class="rejected">
        <li v-for="item in section.rejected" :key="item.pattern">
          <p class="rejected-head">
            <RegexText :pattern="item.pattern" />
            <button type="button" class="try" @click="onTry(item.pattern, 'abc')">
              Try it
            </button>
          </p>
          <p class="muted rejected-reason">{{ item.reason }}</p>
        </li>
      </ul>
    </section>

    <p class="closing">
      The rules of the game itself are on the
      <RouterLink to="/how-to-play">how to play</RouterLink> page.
    </p>
  </div>
</template>

<style scoped>
.tutorial {
  max-width: 48rem;
}

h1 {
  font-size: 1.6rem;
  margin: 0 0 0.75rem;
}

.lead {
  color: var(--muted);
  margin: 0 0 1.75rem;
  max-width: 60ch;
}

.contents {
  border-left: 1px solid var(--border);
  margin: 0 0 1.75rem;
  padding-left: 1rem;
}

.contents-title {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 0.5rem;
}

.contents ol {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.2rem;
  font-size: 0.9rem;
}

.section {
  padding-top: 2.25rem;
}

.section h2 {
  font-size: 1.1rem;
  margin: 0 0 0.6rem;
}

.section p {
  margin: 0 0 0.6rem;
  max-width: 65ch;
}

.syntax {
  border-collapse: collapse;
  margin: 1rem 0 0;
  width: 100%;
}

.syntax th,
.syntax td {
  border-bottom: 1px solid var(--hairline);
  padding: 0.4rem 0.75rem 0.4rem 0;
  text-align: left;
  vertical-align: baseline;
}

.syntax th {
  font-weight: 400;
  white-space: nowrap;
  width: 1%;
}

.syntax code {
  font-family: var(--font-mono);
  color: var(--accent);
}

.syntax td {
  color: var(--text);
  font-size: 0.9rem;
}

.examples {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.rejected {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.rejected-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 1rem;
  margin: 0;
}

.rejected-reason {
  font-size: 0.85rem;
  margin: 0.2rem 0 0;
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

.closing {
  border-top: 1px solid var(--hairline);
  margin: 2.5rem 0 0;
  padding-top: 1.25rem;
  font-size: 0.9rem;
}
</style>
