import { defineStore } from "pinia";
import { ref } from "vue";

export type FontPreference = "atkinson" | "opendyslexic";

const STORAGE_KEY = "rr.font";

function readStored(): FontPreference {
  return localStorage.getItem(STORAGE_KEY) === "opendyslexic"
    ? "opendyslexic"
    : "atkinson";
}

function applyFont(font: FontPreference): void {
  document.documentElement.classList.toggle("font-od", font === "opendyslexic");
}

export const usePrefsStore = defineStore("prefs", () => {
  const font = ref<FontPreference>(readStored());
  applyFont(font.value);

  function setFont(value: FontPreference): void {
    font.value = value;
    localStorage.setItem(STORAGE_KEY, value);
    applyFont(value);
  }

  return { font, setFont };
});
