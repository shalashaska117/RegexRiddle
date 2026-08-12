import { defineStore } from "pinia";
import { ref } from "vue";

export type FontPreference = "atkinson" | "opendyslexic";
export type ThemePreference = "graphite" | "light";

export const TEXT_SCALES = [100, 115, 130, 150] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

const FONT_KEY = "rr.font";
const SCALE_KEY = "rr.textsize";
const THEME_KEY = "rr.theme";

function readStoredFont(): FontPreference {
  return localStorage.getItem(FONT_KEY) === "opendyslexic"
    ? "opendyslexic"
    : "atkinson";
}

function readStoredScale(): TextScale {
  const value = Number(localStorage.getItem(SCALE_KEY));
  return (TEXT_SCALES as readonly number[]).includes(value)
    ? (value as TextScale)
    : 100;
}

function readStoredTheme(): ThemePreference {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "graphite";
}

function applyFont(font: FontPreference): void {
  document.documentElement.classList.toggle("font-od", font === "opendyslexic");
}

// The root font size scales every rem in the stylesheet.
function applyScale(scale: TextScale): void {
  if (scale === 100) {
    document.documentElement.style.removeProperty("font-size");
  } else {
    document.documentElement.style.fontSize = `${scale}%`;
  }
}

function applyTheme(theme: ThemePreference): void {
  document.documentElement.classList.toggle("theme-light", theme === "light");
}

export const usePrefsStore = defineStore("prefs", () => {
  const font = ref<FontPreference>(readStoredFont());
  const textScale = ref<TextScale>(readStoredScale());
  const theme = ref<ThemePreference>(readStoredTheme());
  applyFont(font.value);
  applyScale(textScale.value);
  applyTheme(theme.value);

  function setFont(value: FontPreference): void {
    font.value = value;
    localStorage.setItem(FONT_KEY, value);
    applyFont(value);
  }

  function setTextScale(value: TextScale): void {
    textScale.value = value;
    localStorage.setItem(SCALE_KEY, String(value));
    applyScale(value);
  }

  function setTheme(value: ThemePreference): void {
    theme.value = value;
    localStorage.setItem(THEME_KEY, value);
    applyTheme(value);
  }

  return { font, textScale, theme, setFont, setTextScale, setTheme };
});
