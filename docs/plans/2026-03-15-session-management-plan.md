# Session-Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Session-Snapshots zum Speichern/Laden/Exportieren des gesamten Arbeitsstands als JSON-Dateien, mit Navbar-Indikator und Verwaltung im Export-Center.

**Architecture:** Modul-Level Hilfsfunktionen (`sessionExport`, `sessionImport`, `sessionNew`) sammeln/schreiben alle `SPEngine_*` localStorage-Keys. Navbar zeigt aktive Session mit Dropdown. Export-Center bekommt neuen Session-Bereich oben. Sessions werden als `.json`-Dateien gespeichert (kein localStorage-Limit-Problem).

**Tech Stack:** localStorage API, FileReader API, JSON, Blob/URL.createObjectURL fuer Downloads

---

### Task 1: Session-Hilfsfunktionen (Modul-Level)

**Files:**
- Modify: `portfolio_engine_standalone.html:2140` (nach `useDebouncedSave`)

**Step 1: Session-Export/Import/New Funktionen einfuegen**

Nach Zeile 2140 (Ende von `useDebouncedSave`) einfuegen:

```javascript
// ═══ SESSION MANAGEMENT ═══
const SESSION_FILE_TYPE = "SPEngine_Session";
const SESSION_VERSION = 1;

const sessionGetName = () => lsLoad("sessionName", "Aktuelle Sitzung");
const sessionSetName = (name) => lsSave("sessionName", name);

const sessionGetMeta = () => {
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

const sessionExportJSON = () => {
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

const sessionDownload = (name) => {
  const data = sessionExportJSON();
  if (name) { data.name = name; data.state.sessionName = name; }
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const safeName = (data.name || "Session").replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, "_");
  const a = document.createElement("a");
  a.href = url;
  a.download = `SPEngine_${safeName}_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  // Metadaten in Session-Liste speichern
  const list = lsLoad("sessionList", []);
  const entry = { name: data.name, date: data.created, bonds: data.meta.bonds, scenarios: data.meta.scenarios };
  const idx = list.findIndex(s => s.name === data.name);
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  if (list.length > 10) list.splice(0, list.length - 10);
  lsSave("sessionList", list);
};

const sessionValidate = (data) => {
  if (!data || typeof data !== "object") return "Ungültiges JSON-Format";
  if (data.type !== SESSION_FILE_TYPE) return "Keine gültige SPEngine-Session-Datei (type: " + (data.type||"fehlt") + ")";
  if (!data.state || typeof data.state !== "object") return "Session enthält keine State-Daten";
  return null; // valid
};

const sessionImport = (data) => {
  // Alle bestehenden Keys loeschen
  lsClearAll();
  // State schreiben
  Object.entries(data.state).forEach(([key, value]) => {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch(e) {}
  });
  // Session-Name setzen
  if (data.name) sessionSetName(data.name);
};

const sessionNew = () => {
  lsClearAll();
  sessionSetName("Neue Sitzung");
};

const sessionLoadFile = () => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return reject(new Error("Keine Datei ausgewählt"));
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          const err = sessionValidate(data);
          if (err) return reject(new Error(err));
          resolve(data);
        } catch(e) { reject(new Error("JSON-Parsing fehlgeschlagen: " + e.message)); }
      };
      reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
      reader.readAsText(file);
    };
    input.click();
  });
};
```

**Step 2: Commit**

---

### Task 2: Session-Name State in Komponente

**Files:**
- Modify: `portfolio_engine_standalone.html:10655` (useState-Block)

**Step 1: sessionName State hinzufuegen**

Nach `const [copiedId, setCopiedId] = useState(null);` (ca. Zeile 10657):

```javascript
const [sessionName, setSessionName] = useState(() => sessionGetName());
```

**Step 2: Commit**

---

### Task 3: Navbar Session-Indikator

**Files:**
- Modify: `portfolio_engine_standalone.html:13548-13552` (Navbar rechter Bereich)

**Step 1: Session-Dropdown vor ZoomControls einfuegen**

Finde Zeile 13548:
```jsx
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <ZoomControls level={zoomLevel} onIn={zoomIn} onOut={zoomOut} onReset={zoomReset} />
            </div>
          </div>
```

Ersetze mit:
```jsx
          <div className="flex items-center gap-2">
            {/* Session-Indikator */}
            <div className="relative hidden md:block" ref={(() => { const r = React.useRef(null); return r; })()}>
              {(() => {
                const [showDd, setShowDd] = React.useState(false);
                const [editing, setEditing] = React.useState(false);
                const [editVal, setEditVal] = React.useState(sessionName);
                const ddRef = React.useRef(null);
                React.useEffect(() => {
                  const h = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setShowDd(false); };
                  document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
                }, []);
                const sessList = lsLoad("sessionList", []);
                return (
                  <div ref={ddRef} className="relative">
                    <button onClick={() => setShowDd(!showDd)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200">
                      <span>📋</span>
                      <span className="max-w-[140px] truncate">{sessionName}</span>
                      <span className="text-[9px] text-slate-400">▾</span>
                    </button>
                    {showDd && (
                      <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-2">
                        {!editing ? (
                          <>
                            <div className="px-3 py-1.5 text-[10px] text-slate-400 font-bold uppercase">Aktuelle Session</div>
                            <button onClick={() => { setEditing(true); setEditVal(sessionName); }} className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"><span>✏️</span> Umbenennen</button>
                            <button onClick={() => { sessionDownload(sessionName); setShowDd(false); }} className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"><span>💾</span> Session speichern (Download)</button>
                            <button onClick={() => {
                              const json = sessionExportJSON();
                              const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a"); a.href = url; a.download = `SPEngine_${sessionName.replace(/[^a-zA-Z0-9]/g,"_")}_${new Date().toISOString().slice(0,10)}.json`;
                              document.body.appendChild(a); a.click(); document.body.removeChild(a);
                              URL.revokeObjectURL(url); setShowDd(false);
                            }} className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"><span>📥</span> Als Datei exportieren</button>
                            {sessList.length > 0 && (
                              <>
                                <div className="border-t border-slate-100 my-1"></div>
                                <div className="px-3 py-1.5 text-[10px] text-slate-400 font-bold uppercase">Zuletzt gespeichert</div>
                                {sessList.slice(-5).reverse().map((s, i) => (
                                  <div key={i} className="px-3 py-1.5 text-xs text-slate-500 flex items-center gap-2">
                                    <span>📂</span>
                                    <span className="flex-1 truncate">{s.name}</span>
                                    <span className="text-[10px] text-slate-400">{s.bonds} Bonds</span>
                                  </div>
                                ))}
                              </>
                            )}
                            <div className="border-t border-slate-100 my-1"></div>
                            <button onClick={async () => {
                              try {
                                const data = await sessionLoadFile();
                                if (confirm("Aktuelle Daten werden überschrieben durch: \"" + (data.name||"Session") + "\"\n\nFortfahren?")) {
                                  sessionImport(data);
                                  window.location.reload();
                                }
                              } catch(e) { alert("Import fehlgeschlagen: " + e.message); }
                            }} className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"><span>📤</span> Session aus Datei laden</button>
                            <button onClick={() => {
                              if (confirm("Neue leere Session starten?\n\nAlle aktuellen Daten gehen verloren (vorher speichern!).")) {
                                sessionNew();
                                window.location.reload();
                              }
                            }} className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"><span>➕</span> Neue leere Session</button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button onClick={() => { setTab(8); setShowDd(false); }} className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-spark-600"><span>⚙️</span> Alle Sessions verwalten</button>
                          </>
                        ) : (
                          <div className="px-3 py-2">
                            <input value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => {
                              if (e.key === "Enter" && editVal.trim()) { sessionSetName(editVal.trim()); setSessionName(editVal.trim()); setEditing(false); }
                              if (e.key === "Escape") setEditing(false);
                            }} autoFocus className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs" placeholder="Session-Name..." />
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => { if (editVal.trim()) { sessionSetName(editVal.trim()); setSessionName(editVal.trim()); setEditing(false); } }} className="flex-1 px-2 py-1 bg-spark-600 text-white text-[11px] font-bold rounded-lg">Speichern</button>
                              <button onClick={() => setEditing(false)} className="px-2 py-1 text-slate-500 text-[11px] font-bold rounded-lg border border-slate-200">Abbrechen</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="hidden md:block">
              <ZoomControls level={zoomLevel} onIn={zoomIn} onOut={zoomOut} onReset={zoomReset} />
            </div>
          </div>
```

ACHTUNG: Das obige enthaelt `React.useState` in einer IIFE — das ist ein React-Hooks-Verstoss. Stattdessen:
- Verschiebe `showDd`, `editing`, `editVal` als regulaere useState auf Komponenten-Level (neben `sessionName`)
- Oder: Extrahiere den Dropdown als separate Funktions-Komponente `SessionDropdown`

**Empfohlener Ansatz: SessionDropdown-Komponente** (modul-level, vor der Haupt-Komponente):

```javascript
function SessionDropdown({ sessionName, onRename, onSetTab }) {
  const [showDd, setShowDd] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editVal, setEditVal] = React.useState(sessionName);
  const ddRef = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setShowDd(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const sessList = lsLoad("sessionList", []);
  // ... render dropdown (see above) ...
}
```

Dann in der Navbar: `<SessionDropdown sessionName={sessionName} onRename={(n) => { sessionSetName(n); setSessionName(n); }} onSetTab={setTab} />`

**Step 2: Commit**

---

### Task 4: Export-Center Session-Bereich

**Files:**
- Modify: `portfolio_engine_standalone.html:15820-15830` (Export-Center Header)

**Step 1: Session-Verwaltungs-UI einfuegen**

Nach dem Header-Block (`<h2>Export-Center</h2>`) und vor `Einzel-Exporte`, fuege Session-Bereich ein:

```jsx
{/* ─── Sessions ─── */}
<div>
  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
    <span className="w-8 h-px bg-slate-200"></span> Sessions <span className="flex-1 h-px bg-slate-200"></span>
  </h3>
  <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm space-y-4">
    {/* Aktuelle Session */}
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-[200px]">
        <div className="text-[10px] text-slate-400 font-bold uppercase">Aktuelle Session</div>
        <div className="text-base font-black text-slate-800 mt-0.5">{sessionName}</div>
        <div className="text-[11px] text-slate-500 mt-1 flex gap-3 flex-wrap">
          <span>{marketPortfolio?.length || 0} Bonds</span>
          <span>{savedScenarios?.length || 0} Szenarien</span>
          <span>{pf?.length ? "✓ Portfolio" : "— Kein Portfolio"}</span>
          <span>{universeProfiles?.length || 0} Profile</span>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => {
          const name = prompt("Session-Name:", sessionName);
          if (name?.trim()) { sessionSetName(name.trim()); setSessionName(name.trim()); }
        }} className="px-3 py-2 text-[11px] font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5">
          <span>✏️</span> Umbenennen
        </button>
        <button onClick={() => sessionDownload(sessionName)} className="px-3 py-2 bg-slate-700 text-white text-[11px] font-bold rounded-xl hover:bg-slate-600 transition-all flex items-center gap-1.5 shadow-sm">
          <span>💾</span> Speichern
        </button>
        <button onClick={() => {
          const json = sessionExportJSON();
          const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url;
          a.download = `SPEngine_${sessionName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g,"_")}_${new Date().toISOString().slice(0,10)}.json`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }} className="px-3 py-2 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-xl hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1.5">
          <span>📥</span> Exportieren
        </button>
      </div>
    </div>

    {/* Trennlinie */}
    <div className="border-t border-slate-100"></div>

    {/* Aktionen */}
    <div className="flex gap-3 flex-wrap">
      <button onClick={async () => {
        try {
          const data = await sessionLoadFile();
          if (confirm("Aktuelle Daten werden überschrieben durch:\n\"" + (data.name||"Session") + "\"\n(" + (data.meta?.bonds||"?") + " Bonds, " + (data.meta?.scenarios||"?") + " Szenarien)\n\nFortfahren?")) {
            sessionImport(data);
            window.location.reload();
          }
        } catch(e) { alert("Import fehlgeschlagen: " + e.message); }
      }} className="px-4 py-2.5 bg-spark-50 text-spark-700 text-[11px] font-bold rounded-xl hover:bg-spark-100 border border-spark-200 transition-all flex items-center gap-1.5">
        <span>📤</span> Session aus Datei laden
      </button>
      <button onClick={() => {
        if (confirm("Neue leere Session starten?\n\nAktuelle Daten vorher mit 'Speichern' sichern!")) {
          sessionNew();
          window.location.reload();
        }
      }} className="px-4 py-2.5 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-xl hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5">
        <span>➕</span> Neue leere Session
      </button>
    </div>

    {/* Gespeicherte Sessions Liste */}
    {(() => {
      const sessList = lsLoad("sessionList", []);
      if (!sessList.length) return null;
      return (
        <>
          <div className="border-t border-slate-100"></div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Zuletzt gespeicherte Sessions</div>
            <div className="space-y-1.5">
              {sessList.slice().reverse().map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span>📂</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-700 truncate">{s.name}</div>
                    <div className="text-[10px] text-slate-400">{s.bonds} Bonds · {s.scenarios} Szenarien · {new Date(s.date).toLocaleDateString("de-DE")}</div>
                  </div>
                  <button onClick={() => {
                    const list = lsLoad("sessionList", []);
                    lsSave("sessionList", list.filter(x => x.name !== s.name));
                    window.location.reload();
                  }} className="text-slate-400 hover:text-rose-500 text-xs transition-colors" title="Aus Liste entfernen">🗑</button>
                </div>
              ))}
            </div>
          </div>
        </>
      );
    })()}
  </div>
</div>
```

**Step 2: Commit**

---

### Task 5: SessionDropdown-Komponente (Navbar)

**Files:**
- Modify: `portfolio_engine_standalone.html` — vor der Hauptkomponente (ca. Zeile 10090, vor `function ZoomControls`)

**Step 1: SessionDropdown-Komponente erstellen**

```javascript
function SessionDropdown({ sessionName, onRename, onSetTab }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editVal, setEditVal] = React.useState(sessionName);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  React.useEffect(() => { setEditVal(sessionName); }, [sessionName]);

  const sessList = lsLoad("sessionList", []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200 bg-white">
        <span className="text-sm">📋</span>
        <span className="max-w-[140px] truncate">{sessionName}</span>
        <span className="text-[9px] text-slate-400 ml-0.5">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1 animate-in fade-in slide-in-from-top-1">
          {!editing ? (
            <>
              <div className="px-3 py-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Aktuelle Session</div>
              <button onClick={() => setEditing(true)} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"><span>✏️</span> Umbenennen</button>
              <button onClick={() => { sessionDownload(sessionName); setOpen(false); }} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"><span>💾</span> Session speichern</button>
              <button onClick={() => {
                const json = sessionExportJSON();
                const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url;
                a.download = `SPEngine_${sessionName.replace(/[^a-zA-Z0-9]/g,"_")}_${new Date().toISOString().slice(0,10)}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url); setOpen(false);
              }} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"><span>📥</span> Als Datei exportieren</button>
              {sessList.length > 0 && (
                <>
                  <div className="border-t border-slate-100 my-1"></div>
                  <div className="px-3 py-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Zuletzt gespeichert</div>
                  {sessList.slice(-5).reverse().map((s, i) => (
                    <div key={i} className="px-3 py-1.5 text-[11px] text-slate-500 flex items-center gap-2">
                      <span>📂</span><span className="flex-1 truncate">{s.name}</span>
                      <span className="text-[9px] text-slate-400">{s.bonds} B</span>
                    </div>
                  ))}
                </>
              )}
              <div className="border-t border-slate-100 my-1"></div>
              <button onClick={async () => {
                try {
                  const data = await sessionLoadFile();
                  if (confirm("Session laden: \"" + (data.name||"?") + "\"?\nAktuelle Daten werden ueberschrieben.")) {
                    sessionImport(data); window.location.reload();
                  }
                } catch(e) { alert("Import: " + e.message); }
              }} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"><span>📤</span> Session aus Datei laden</button>
              <button onClick={() => {
                if (confirm("Neue leere Session?\nAktuelle Daten gehen verloren!")) { sessionNew(); window.location.reload(); }
              }} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"><span>➕</span> Neue leere Session</button>
              <div className="border-t border-slate-100 my-1"></div>
              <button onClick={() => { onSetTab(8); setOpen(false); }} className="w-full px-3 py-2 text-left text-xs text-spark-600 font-bold hover:bg-spark-50 flex items-center gap-2 transition-colors"><span>⚙️</span> Sessions verwalten</button>
            </>
          ) : (
            <div className="px-3 py-3">
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">Session umbenennen</div>
              <input value={editVal} onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter" && editVal.trim()) { onRename(editVal.trim()); setEditing(false); setOpen(false); } if (e.key==="Escape") setEditing(false); }}
                autoFocus className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:border-spark-400 focus:ring-1 focus:ring-spark-200 outline-none" />
              <div className="flex gap-2 mt-2">
                <button onClick={() => { if(editVal.trim()) { onRename(editVal.trim()); setEditing(false); setOpen(false); }}} className="flex-1 px-2 py-1.5 bg-spark-600 text-white text-[11px] font-bold rounded-lg hover:bg-spark-700 transition-colors">OK</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-slate-500 text-[11px] font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Navbar einbinden**

In der Navbar (Zeile ~13548), vor ZoomControls:

```jsx
<div className="hidden md:block">
  <SessionDropdown
    sessionName={sessionName}
    onRename={(n) => { sessionSetName(n); setSessionName(n); }}
    onSetTab={setTab}
  />
</div>
```

**Step 3: Commit**

---

## Ausfuehrungsreihenfolge

| # | Task | Abhaengigkeit |
|---|------|---------------|
| 1 | Session-Hilfsfunktionen | - |
| 2 | sessionName State | Task 1 |
| 3 | Navbar Session-Indikator (via SessionDropdown) | Task 1, 2, 5 |
| 4 | Export-Center Session-Bereich | Task 1, 2 |
| 5 | SessionDropdown-Komponente | Task 1 |

Empfohlene Reihenfolge: 1 → 2 → 5 → 3 → 4

Tasks 1 und 5 koennten parallel laufen, aber da alles eine Datei ist: sequenziell.
