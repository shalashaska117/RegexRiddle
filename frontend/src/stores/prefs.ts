import { defineStore } from "pinia";
import { ref } from "vue";

export type FontPreference = "atkinson" | "opendyslexic";
export type ThemePreference = "graphite" | "light";

export const TEXT_SCALES = [100, 115, 130, 150] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

const FONT_KEY = "rr.font";
const SCALE_KEY = "rr.textsize";
const THEME_KEY = "rr.theme";

/**
 * Read the saved font choice with an Atkinson fallback.
 * Parameters: none.
 * @returns The stored OpenDyslexic choice, or atkinson for any other value.
 */
function readStoredFont(): FontPreference {
  return localStorage.getItem(FONT_KEY) === "opendyslexic"
    ? "opendyslexic"
    : "atkinson";
}

/**
 * Read a saved text scale and reject unsupported values.
 * Parameters: none.
 * @returns A supported percentage, or 100 when storage has no valid choice.
 */
function readStoredScale(): TextScale {
  const value = Number(localStorage.getItem(SCALE_KEY));
  return (TEXT_SCALES as readonly number[]).includes(value)
    ? (value as TextScale)
    : 100;
}

/**
 * Read the saved color theme with a dark-theme fallback.
 * Parameters: none.
 * @returns The light choice when stored, otherwise graphite.
 */
function readStoredTheme(): ThemePreference {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "graphite";
}

/**
 * Apply the font choice to the document.
 * @param font - Font preference to apply.
 * @returns Nothing; toggles the root class used by the font styles.
 */
function applyFont(font: FontPreference): void {
  document.documentElement.classList.toggle("font-od", font === "opendyslexic");
}

// The root font size scales every rem in the stylesheet.
/**
 * Scale the page through its root font size.
 * @param scale - Supported text-size percentage to apply.
 * @returns Nothing; sets a percentage font size or restores the default at 100.
 */
function applyScale(scale: TextScale): void {
  if (scale === 100) {
    document.documentElement.style.removeProperty("font-size");
  } else {
    document.documentElement.style.fontSize = `${scale}%`;
  }
}

/**
 * Apply the selected color palette.
 * @param theme - Theme preference to apply.
 * @returns Nothing; toggles the root class used by the light theme.
 */
function applyTheme(theme: ThemePreference): void {
  document.documentElement.classList.toggle("theme-light", theme === "light");
}

export const usePrefsStore = defineStore("prefs", /**
 * Restore reading preferences and expose actions to change them.
 * Parameters: none.
 * @returns Font, text-scale and theme refs with their saving/applying actions.
 */
() => {
  const font = ref<FontPreference>(readStoredFont());
  const textScale = ref<TextScale>(readStoredScale());
  const theme = ref<ThemePreference>(readStoredTheme());
  applyFont(font.value);
  applyScale(textScale.value);
  applyTheme(theme.value);

  /**
   * Save a font preference and apply it immediately.
   * @param value - Font choice selected by the player.
   * @returns Nothing; updates reactive state, local storage and page styling.
   */
  function setFont(value: FontPreference): void {
    font.value = value;
    localStorage.setItem(FONT_KEY, value);
    applyFont(value);
  }

  /**
   * Save a text scale and apply it immediately.
   * @param value - Supported text-size percentage selected by the player.
   * @returns Nothing; updates reactive state, local storage and root font size.
   */
  function setTextScale(value: TextScale): void {
    textScale.value = value;
    localStorage.setItem(SCALE_KEY, String(value));
    applyScale(value);
  }

  /**
   * Save a color theme and apply it immediately.
   * @param value - Theme selected by the player.
   * @returns Nothing; updates reactive state, local storage and page styling.
   */
  function setTheme(value: ThemePreference): void {
    theme.value = value;
    localStorage.setItem(THEME_KEY, value);
    applyTheme(value);
  }

  return { font, textScale, theme, setFont, setTextScale, setTheme };
});
