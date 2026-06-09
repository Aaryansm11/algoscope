export interface SavedItem {
  name: string;
  code: string;
  input: string;
}

const KEY = "algoscope.saved.v1";

export function loadSaved(): SavedItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function persistSaved(items: SavedItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / private-mode errors */
  }
}
