// Content of the tutorial page, kept as data rather than markup so the whole
// of it can be checked against the real engine. Every claim below is verified
// by backend/tests/80-tutorial-content.test.ts, which runs each pattern over
// each sample string; a wrong example fails the API suite.

export interface SyntaxRow {
  token: string;
  meaning: string;
}

export interface Example {
  pattern: string;
  matches: string[];
  nonMatches: string[];
  note?: string;
}

export interface RejectedPattern {
  pattern: string;
  reason: string;
}

export interface Section {
  id: string;
  title: string;
  paragraphs: string[];
  syntax?: SyntaxRow[];
  examples?: Example[];
  rejected?: RejectedPattern[];
}

export const TUTORIAL_SECTIONS: Section[] = [
  {
    id: "what-a-regex-is",
    title: "What a regular expression is",
    paragraphs: [
      "A regular expression is a pattern that a string either matches or does not. Ordinary characters stand for themselves; a small set of symbols stand for choices, repetitions and positions.",
      "RegexRiddle always asks for a full match. The pattern has to describe the whole string, not a part of it, and the server anchors every pattern before running it. A pattern that would pick a word out of a sentence elsewhere matches nothing but that word here.",
    ],
    examples: [
      {
        pattern: "cat",
        matches: ["cat"],
        nonMatches: ["cats", "Cat", "concat"],
        note: "Three literal characters, and the string has to be exactly those three. Matching is case sensitive.",
      },
    ],
  },
  {
    id: "literals-and-the-dot",
    title: "Literals and the dot",
    paragraphs: [
      "Most characters match themselves. The dot is the first exception: it stands for any single character, and for exactly one.",
    ],
    syntax: [
      { token: "a", meaning: "the letter a and nothing else" },
      { token: ".", meaning: "any one character" },
    ],
    examples: [
      {
        pattern: "c.t",
        matches: ["cat", "cot", "c9t"],
        nonMatches: ["ct", "coat"],
      },
      {
        pattern: "...",
        matches: ["abc", "x9!"],
        nonMatches: ["ab", "abcd"],
        note: "Three dots mean three characters, whichever they are.",
      },
    ],
  },
  {
    id: "character-classes",
    title: "Character classes",
    paragraphs: [
      "Square brackets list the characters allowed at one position. A dash between two characters means the range from one to the other, and a caret at the front means every character except the ones listed.",
      "The common classes have shorthands, each with an uppercase form that means the opposite.",
    ],
    syntax: [
      { token: "[abc]", meaning: "one of a, b or c" },
      { token: "[a-z]", meaning: "one lowercase letter" },
      { token: "[^0-9]", meaning: "any one character that is not a digit" },
      { token: "\\d", meaning: "one digit, the same as [0-9]" },
      { token: "\\w", meaning: "one letter, digit or underscore" },
      { token: "\\s", meaning: "one whitespace character" },
      { token: "\\D \\W \\S", meaning: "the negation of each shorthand" },
    ],
    examples: [
      {
        pattern: "[a-c][0-9]",
        matches: ["a1", "c9"],
        nonMatches: ["d1", "1a", "a10"],
      },
      {
        pattern: "\\d\\d:\\d\\d",
        matches: ["09:30", "23:59"],
        nonMatches: ["9:30", "09-30"],
        note: "A class describes one position, so a two-digit field needs two of them.",
      },
      {
        pattern: "[^aeiou]+",
        matches: ["rhythm", "xyz"],
        nonMatches: ["cat", "hello"],
      },
    ],
  },
  {
    id: "quantifiers",
    title: "Quantifiers",
    paragraphs: [
      "A quantifier repeats whatever stands immediately before it: one character, one class, or one group.",
    ],
    syntax: [
      { token: "a*", meaning: "zero or more a" },
      { token: "a+", meaning: "one or more a" },
      { token: "a?", meaning: "zero or one a" },
      { token: "a{3}", meaning: "exactly three a" },
      { token: "a{2,}", meaning: "two or more a" },
      { token: "a{2,4}", meaning: "between two and four a" },
    ],
    examples: [
      {
        pattern: "colou?r",
        matches: ["color", "colour"],
        nonMatches: ["colouur", "Colour"],
        note: "The question mark applies to the u alone, so the u is optional and nothing else changes.",
      },
      {
        pattern: "[0-9]{3}",
        matches: ["123", "007"],
        nonMatches: ["12", "1234"],
      },
      {
        pattern: "ab*",
        matches: ["a", "ab", "abbb"],
        nonMatches: ["b", "aab"],
        note: "Zero or more, so the string with no b at all is a match.",
      },
    ],
  },
  {
    id: "groups-and-alternation",
    title: "Groups and alternation",
    paragraphs: [
      "Parentheses tie a piece of the pattern together so that a quantifier applies to all of it. A vertical bar between two pieces means either one.",
      "The bar splits as much of the pattern as it can reach, which is why grouping it matters.",
    ],
    syntax: [
      { token: "(ab)", meaning: "the pair ab treated as one unit" },
      { token: "cat|dog", meaning: "either cat or dog" },
      { token: "(cat|dog)s", meaning: "cats or dogs" },
    ],
    examples: [
      {
        pattern: "(ab)+",
        matches: ["ab", "ababab"],
        nonMatches: ["aba", "ba"],
      },
      {
        pattern: "(cat|dog)s?",
        matches: ["cat", "dogs"],
        nonMatches: ["catdog", "dogss"],
      },
      {
        pattern: "cat|dogs",
        matches: ["cat", "dogs"],
        nonMatches: ["cats", "catdogs"],
        note: "Without parentheses the bar divides the whole pattern, so this reads as cat or dogs, not as cat or dog followed by s.",
      },
    ],
  },
  {
    id: "anchors",
    title: "Anchors",
    paragraphs: [
      "The caret marks the start of the string and the dollar marks the end. In most tools they are what turns a search into a full match.",
      "RegexRiddle anchors every pattern for you, so both are already implied. They are still accepted, and adding them changes nothing.",
    ],
    syntax: [
      { token: "^", meaning: "start of the string" },
      { token: "$", meaning: "end of the string" },
    ],
    examples: [
      {
        pattern: "^[0-9]+$",
        matches: ["42", "007"],
        nonMatches: ["4a", "4 2"],
        note: "Behaves exactly like the same pattern without the anchors.",
      },
    ],
  },
  {
    id: "escaping",
    title: "Escaping",
    paragraphs: [
      "A backslash takes away a symbol's special meaning. Every symbol listed above needs one to be matched as itself.",
    ],
    syntax: [
      { token: "\\.", meaning: "a literal dot" },
      { token: "\\+", meaning: "a literal plus" },
      { token: "\\(", meaning: "a literal opening parenthesis" },
      { token: "\\\\", meaning: "a literal backslash" },
      { token: "[.]", meaning: "also a literal dot: inside a class most symbols lose their meaning" },
    ],
    examples: [
      {
        pattern: "[a-z]+\\.[a-z]+",
        matches: ["notes.txt", "read.me"],
        nonMatches: ["notes-txt", "Notes.txt"],
      },
      {
        pattern: "3\\+4",
        matches: ["3+4"],
        nonMatches: ["34", "3-4"],
      },
    ],
  },
  {
    id: "what-re2-rejects",
    title: "What the engine refuses",
    paragraphs: [
      "Patterns run under RE2, which matches in time proportional to the length of the string and never backtracks. That is what keeps one crafted pattern from taking the server down, and it is also why the two features that need backtracking are missing.",
      "A pattern that uses either is refused when you submit it, with the engine's own message. Everything above this point is supported.",
    ],
    rejected: [
      {
        pattern: "(a)\\1",
        reason: "Backreference: \\1 stands for whatever the first group captured.",
      },
      {
        pattern: "(?=abc)x",
        reason: "Lookahead: it asserts what comes next without consuming it.",
      },
      {
        pattern: "(?<=abc)x",
        reason: "Lookbehind: the same idea, pointed backwards.",
      },
    ],
  },
  {
    id: "solving-a-riddle",
    title: "Working a riddle out",
    paragraphs: [
      "A riddle hands you one string the secret pattern matches and one it does not. Write the loosest pattern that respects both, submit it, and tighten it wherever the score says you are wrong.",
      "Here is that worked through on a riddle whose public examples are #1abc9c, which matches, and 1abc9c, which does not.",
    ],
    examples: [
      {
        pattern: ".+",
        matches: ["#1abc9c", "1abc9c"],
        nonMatches: [""],
        note: "Start at the top. It matches both examples, so it is wrong about the second one and will miss every negative control.",
      },
      {
        pattern: "#.+",
        matches: ["#1abc9c"],
        nonMatches: ["1abc9c"],
        note: "Right about both public examples now. Still far too loose: it takes #zzz as well.",
      },
      {
        pattern: "#[0-9a-f]+",
        matches: ["#1abc9c", "#abc"],
        nonMatches: ["1abc9c", "#xyz"],
        note: "The characters are pinned down. The length is not, so short strings still slip through.",
      },
      {
        pattern: "#[0-9a-f]{6}",
        matches: ["#1abc9c"],
        nonMatches: ["1abc9c", "#abc", "#1abc9cd"],
        note: "Six hexadecimal digits after the hash. This is the pattern on the landing page.",
      },
    ],
  },
];
