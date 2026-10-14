// Unit checks for the RE2 wrapper. No HTTP involved; the runner boots the
// server anyway, these tests just don't use it.
import assert from "node:assert/strict";
import {
  createMatcher,
  MAX_PATTERN_LENGTH,
  MAX_INPUT_LENGTH,
} from "../src/services/regex/engine.js";

/**
 * Compiles a test pattern and fails if the engine rejects it.
 * @param pattern - Regex source expected to be valid.
 * @returns The compiled matcher.
 */
function compile(pattern: string) {
  const m = createMatcher(pattern);
  if (!m.ok) throw new Error(`pattern ${pattern} should compile: ${m.error}`);
  return m;
}

// literal match
{
  const m = compile("abc");
  assert.equal(m.test("abc"), true);
  assert.equal(m.test("abd"), false);
}

// full-match anchoring: "b" is a substring of "abc" but not a full match
{
  const m = compile("b");
  assert.equal(m.test("b"), true);
  assert.equal(m.test("abc"), false);
}

// alternation
{
  const m = compile("cat|dog");
  assert.equal(m.test("cat"), true);
  assert.equal(m.test("dog"), true);
  assert.equal(m.test("catdog"), false);
}

// character classes
{
  const m = compile("[a-c]+[0-9]");
  assert.equal(m.test("abc7"), true);
  assert.equal(m.test("abd7"), false);
  assert.equal(m.test("abc"), false);
}

// quantifiers, including a nested one that blows up backtracking engines.
// (a+)+ against a long non-matching string must stay fast: that is the
// whole point of RE2 (docs/security.md).
{
  const m = compile("(a+)+");
  const evil = "a".repeat(199) + "b";
  assert.equal(evil.length, 200);
  const started = performance.now();
  assert.equal(m.test(evil), false);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 1000, `(a+)+ on 200 chars took ${elapsed}ms`);
  assert.equal(m.test("aaaa"), true);
}

// empty string: satisfied by a*, not by a+
{
  assert.equal(compile("a*").test(""), true);
  assert.equal(compile("a+").test(""), false);
}

// unicode input
{
  const m = compile("über");
  assert.equal(m.test("über"), true);
  assert.equal(m.test("uber"), false);
  assert.equal(compile(".+").test("日本語🙂"), true);
}

// invalid syntax RE2 rejects: backreference and lookahead
{
  const back = createMatcher("(a)\\1");
  assert.equal(back.ok, false);
  const ahead = createMatcher("(?=a)");
  assert.equal(ahead.ok, false);
}

// group injection: an unmatched ")" would close the ^(?:...)$ wrapper
// early, turning "a)|(b" into "^(?:a)|(b)$", which matches any string
// that starts with a or ends with b. Such patterns must be rejected, not
// scored with substring semantics.
{
  assert.equal(createMatcher("a)|(b").ok, false);
  assert.equal(createMatcher(")|(").ok, false);
  assert.equal(createMatcher(")").ok, false);
  assert.equal(createMatcher("abc)|(def").ok, false);
}

// balanced groups still work and stay anchored
{
  const m = compile("(a)|(b)");
  assert.equal(m.test("a"), true);
  assert.equal(m.test("b"), true);
  assert.equal(m.test("axxxx"), false);
  assert.equal(m.test("xxxxb"), false);
}

// a ")" that is escaped or inside a character class is literal, not a
// group close, and must keep compiling
{
  assert.equal(compile("\\)").test(")"), true);
  assert.equal(compile("[)]+").test("))"), true);
}

// pattern over the length cap
{
  const m = createMatcher("a".repeat(MAX_PATTERN_LENGTH + 1));
  assert.equal(m.ok, false);
}

// input over the length cap throws instead of silently failing the match
{
  const m = compile("a*");
  assert.throws(
    /**
     * Exercises rejection of a subject longer than the input limit.
     * Parameters: none.
     * @returns The match result if the expected RangeError is not thrown.
     */
    () => m.test("a".repeat(MAX_INPUT_LENGTH + 1))
  , RangeError);
}
