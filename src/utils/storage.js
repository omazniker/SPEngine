// localStorage persistence helpers and session management utilities.
// useDebouncedSave is a React hook that debounces writes to localStorage.
// Session functions handle import/export of the full app state as JSON.

import { useEffect } from 'react';
import { downloadBlob } from './format.js';

// ═══ LOCALSTORAGE HELPERS ═══

export const LS_PREFIX = "SPEngine_";
export const LS_VERSION = "v3.6";

export const lsSave = (key, value) => {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn("[Storage] Speichern fehlgeschlagen:", key, e.message);
  }
};

export const lsLoad = (key, fallback) => {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[Storage] Laden fehlgeschlagen:", key, e.message);
    return fallback;
  }
};

export const lsRemove = (key) => {
  try { localStorage.removeItem(LS_PREFIX + key); } catch(e) {}
};

export const lsClearAll = () => {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch(e) {}
};

export const lsGetSize = () => {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) {
        total += (localStorage.getItem(k) || "").length;
      }
    }
    return total;
  } catch(e) { return 0; }
};

/** React hook: debounces lsSave calls to avoid excessive writes on rapid state changes. */
export const useDebouncedSave = (key, value, delay = 800) => {
  useEffect(() => {
    const timer = setTimeout(() => lsSave(key, value), delay);
    return () => clearTimeout(timer);
  }, [key, value, delay]);
};

// ═══ SESSION MANAGEMENT ═══

export const SESSION_FILE_TYPE = "SPEngine_Session";
export const SESSION_VERSION = 1;

export const sessionGetName = () => lsLoad("sessionName", "Aktuelle Sitzung");
export const sessionSetName = (name) => lsSave("sessionName", name);

export const sessionGetMeta = () => {
  const datasets = lsLoad("datasets", []);
  const scenarios = lsLoad("scenarios", []);
  const portfolio = lsLoad("lastPortfolio", []);
  const profiles = lsLoad("universeProfiles", []);
  const activeDs = datasets.find(d => d.id === lsLoad("activeDatasetId", "default"));
  return {
    name: sessionGetName(),
    date: new Date().toISOString(),
    bonds: activeDs?.data?.length || 0,
    scenarios: scenarios.length,
    hasPortfolio: portfolio.length > 0,
    profiles: profiles.length,
  };
};

export const sessionExportJSON = () => {
  const state = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LS_PREFIX)) {
      const shortKey = k.slice(LS_PREFIX.length);
      try { state[shortKey] = JSON.parse(localStorage.getItem(k)); } catch(e) { state[shortKey] = localStorage.getItem(k); }
    }
  }
  const meta = sessionGetMeta();
  return {
    type: SESSION_FILE_TYPE,
    version: SESSION_VERSION,
    name: meta.name,
    created: meta.date,
    meta,
    state,
  };
};

export const sessionDownload = (name) => {
  const data = sessionExportJSON();
  if (name) { data.name = name; data.state.sessionName = name; }
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  const safeName = (data.name || "Session").replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df_-]/g, "_");
  downloadBlob(blob, `SPEngine_${safeName}_${new Date().toISOString().slice(0,10)}.json`);
  // Metadaten in Session-Liste speichern
  const list = lsLoad("sessionList", []);
  const entry = { name: data.name, date: data.created, bonds: data.meta.bonds, scenarios: data.meta.scenarios };
  const idx = list.findIndex(s => s.name === data.name);
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  if (list.length > 10) list.splice(0, list.length - 10);
  lsSave("sessionList", list);
};

export const sessionValidate = (data) => {
  if (!data || typeof data !== "object") return "Ungültiges JSON-Format";
  if (data.type !== SESSION_FILE_TYPE) return "Keine gültige SPEngine-Session-Datei (type: " + (data.type||"fehlt") + ")";
  if (!data.state || typeof data.state !== "object") return "Session enthält keine State-Daten";
  return null; // valid
};

export const sessionImport = (data) => {
  lsClearAll();
  Object.entries(data.state).forEach(([key, value]) => {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch(e) {}
  });
  if (data.name) sessionSetName(data.name);
};

export const sessionNew = () => {
  lsClearAll();
  sessionSetName("Neue Sitzung");
};

export const sessionLoadFile = () => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.style.display = "none";
    const cleanup = () => { try { document.body.removeChild(input); } catch(e) {} };
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) { cleanup(); return reject(new Error("Keine Datei ausgewählt")); }
      const reader = new FileReader();
      reader.onload = (evt) => {
        cleanup();
        try {
          const data = JSON.parse(evt.target.result);
          const err = sessionValidate(data);
          if (err) return reject(new Error(err));
          resolve(data);
        } catch(e) { reject(new Error("JSON-Parsing fehlgeschlagen: " + e.message)); }
      };
      reader.onerror = () => { cleanup(); reject(new Error("Datei konnte nicht gelesen werden")); };
      reader.readAsText(file);
    };
    input.addEventListener("cancel", () => { cleanup(); reject(new Error("Abgebrochen")); });
    document.body.appendChild(input);
    input.click();
  });
};
