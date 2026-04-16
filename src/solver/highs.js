// HiGHS WASM solver loader + javascript-lp-solver wrapper
// Extracted from tests/test_lexicographic.html lines 2259-2370

import solver from 'javascript-lp-solver';

// ── javascript-lp-solver ──────────────────────────────────────────────────────
let solverLib = null;
let solverPromise = null;

export function getSolver() {
  if (solverLib) return Promise.resolve(solverLib);
  if (solverPromise) return solverPromise;
  solverPromise = new Promise((resolve, reject) => {
    if (solver) {
      solverLib = solver;
      resolve(solverLib);
    } else {
      reject(new Error("Linearer Solver nicht verfügbar (lokales Bundle nicht geladen)."));
    }
  }).catch(e => { solverPromise = null; throw e; });
  return solverPromise;
}

// ── HiGHS WASM ───────────────────────────────────────────────────────────────
export let highsLib = null;
export let highsPromise = null;
let _highsFactory = null; // Cached factory function (avoids CDN re-fetch)
let _highsCdnUrl = null;  // CDN URL used for locateFile

export function getHighsSolver() {
  if (highsLib) return Promise.resolve(highsLib);
  if (highsPromise) return highsPromise;
  // Fast path: re-instantiate from cached factory (no CDN fetch needed)
  if (_highsFactory && _highsCdnUrl) {
    highsPromise = Promise.resolve(_highsFactory({
      locateFile: (fn) => _highsCdnUrl + fn,
      print: (t) => console.log("[HiGHS-WASM]", t),
      printErr: (t) => console.error("[HiGHS-WASM]", t)
    })).then(inst => {
      if (inst && typeof inst.solve === 'function') {
        highsLib = inst;
        console.log("[HiGHS] Re-instantiated from cached factory ✓");
        return inst;
      }
      // Cache invalid, fall through to full reload
      _highsFactory = null; _highsCdnUrl = null;
      highsPromise = null;
      return getHighsSolver();
    }).catch(() => {
      _highsFactory = null; _highsCdnUrl = null;
      highsPromise = null;
      return getHighsSolver();
    });
    return highsPromise;
  }
  highsPromise = new Promise((resolve, reject) => {
    const CDN_VERSIONS = [
      'https://cdn.jsdelivr.net/npm/highs@1.0.1/build/',
      'https://cdn.jsdelivr.net/npm/highs@1.8.0/build/'
    ];
    function loadViaCDN(reason, versionIdx) {
      const vi = versionIdx || 0;
      const cdnUrl = CDN_VERSIONS[vi] || CDN_VERSIONS[0];
      console.log("[HiGHS] CDN-Loading v" + (vi === 0 ? "1.0.1" : "1.8.0") + (reason ? " (Grund: " + reason + ")" : "") + "...");
      const savedModule = window.Module;
      window.Module = undefined;
      const s = document.createElement('script');
      s.src = cdnUrl + 'highs.js';
      s.onload = () => {
        const f = window.Module;
        console.log("[HiGHS] CDN-Script geladen. Module type:", typeof f, "von", cdnUrl);
        if (!f || typeof f !== 'function') {
          window.Module = savedModule;
          if (vi < CDN_VERSIONS.length - 1) { loadViaCDN("v" + (vi === 0 ? "1.0.1" : "1.8.0") + " global nicht gefunden", vi + 1); return; }
          highsPromise = null; reject(new Error("HiGHS CDN: global nicht gefunden")); return;
        }
        // Cache the factory for fast re-instantiation
        _highsFactory = f;
        _highsCdnUrl = cdnUrl;
        Promise.resolve(f({ locateFile: (fn) => cdnUrl + fn, print: (t) => console.log("[HiGHS-WASM]", t), printErr: (t) => console.error("[HiGHS-WASM]", t) }))
          .then(inst => {
            console.log("[HiGHS] Factory resolved. solve type:", typeof (inst && inst.solve));
            if (inst && typeof inst.solve === 'function') { highsLib = inst; console.log("[HiGHS] Solver via CDN geladen (v" + (vi === 0 ? "1.0.1" : "1.8.0") + ")"); resolve(inst); }
            else {
              window.Module = savedModule;
              if (vi < CDN_VERSIONS.length - 1) { loadViaCDN("keine solve()-Methode in v" + (vi === 0 ? "1.0.1" : "1.8.0"), vi + 1); return; }
              highsPromise = null; reject(new Error("HiGHS CDN: keine solve()-Methode."));
            }
          })
          .catch(e => {
            window.Module = savedModule;
            if (vi < CDN_VERSIONS.length - 1) { loadViaCDN("Init-Fehler v" + (vi === 0 ? "1.0.1" : "1.8.0") + ": " + e.message, vi + 1); return; }
            highsPromise = null; reject(new Error("HiGHS CDN Init-Fehler: " + e.message));
          });
      };
      s.onerror = () => {
        window.Module = savedModule;
        if (vi < CDN_VERSIONS.length - 1) { loadViaCDN("CDN v" + (vi === 0 ? "1.0.1" : "1.8.0") + " nicht erreichbar", vi + 1); return; }
        highsPromise = null; reject(new Error("HiGHS CDN nicht erreichbar." + (reason ? " " + reason : "")));
      };
      document.head.appendChild(s);
    }
    // Versuch 1: Lokales Bundle (funktioniert nur auf HTTP, nicht auf file://)
    const factory = window.highs || window.Highs || window.Module;
    if (factory && typeof factory === 'function' && location.protocol !== 'file:') {
      console.log("[HiGHS] Versuche lokales WASM-Loading (HTTP)...");
      const timeout = setTimeout(() => { loadViaCDN("lokaler Timeout"); }, 8000);
      Promise.resolve(factory())
        .then(inst => {
          clearTimeout(timeout);
          if (inst && typeof inst.solve === 'function') { highsLib = inst; console.log("[HiGHS] Solver aus lokalem Bundle geladen"); resolve(inst); }
          else { loadViaCDN("keine solve()-Methode"); }
        })
        .catch(e => { clearTimeout(timeout); loadViaCDN(e.message); });
    } else {
      // file:// Protokoll oder kein vorgeladenes Module → direkt CDN
      loadViaCDN(location.protocol === 'file:' ? "file://-Protokoll" : "kein lokales Module");
    }
  });
  return highsPromise;
}

// Reset HiGHS instance — used by frontier and auto-optimizer for memory management
export function resetHighs() {
  highsLib = null;
  highsPromise = null;
}
