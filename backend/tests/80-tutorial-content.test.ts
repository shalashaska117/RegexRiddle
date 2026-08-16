// The tutorial page teaches by example, so a wrong example is a wrong lesson.
// This runs every pattern in the page's content against every sample string
// it claims for that pattern, through the engine the game itself uses. It
// reaches into the front-end package on purpose: the content is data there,
// and checking a copy would only prove the copy right.
import assert from "node:assert/strict";
import { createMatcher } from "../src/services/regex/engine.js";
import { TUTORIAL_SECTIONS } from "../../frontend/src/lib/tutorial.js";

let checked = 0;

for (const section of TUTORIAL_SECTIONS) {
  assert.ok(section.paragraphs.length > 0, `section ${section.id} has no prose`);

  for (const example of section.examples ?? []) {
    const matcher = createMatcher(example.pattern);
    assert.ok(matcher.ok, `${section.id}: ${example.pattern} does not compile`);
    if (!matcher.ok) continue;

    assert.ok(
      example.matches.length + example.nonMatches.length > 0,
      `${section.id}: ${example.pattern} shows no samples`,
    );
    for (const sample of example.matches) {
      assert.equal(
        matcher.test(sample),
        true,
        `${section.id}: ${example.pattern} is shown matching ${JSON.stringify(sample)}, and does not`,
      );
      checked += 1;
    }
    for (const sample of example.nonMatches) {
      assert.equal(
        matcher.test(sample),
        false,
        `${section.id}: ${example.pattern} is shown not matching ${JSON.stringify(sample)}, and does`,
      );
      checked += 1;
    }
  }

  // The refused patterns have to stay refused, otherwise the section that
  // explains the engine's limits is teaching a limit that is not there.
  for (const item of section.rejected ?? []) {
    assert.equal(
      createMatcher(item.pattern).ok,
      false,
      `${section.id}: ${item.pattern} is shown as refused, and compiles`,
    );
    checked += 1;
  }
}

assert.ok(checked > 40, `only ${checked} tutorial claims checked`);
