import React from 'react';
import { fxV } from '../../utils/format.js';
import { calcHHI } from './deepdiveUtils.js';

export default function DeepDiveBarometer({ stats: s, bonds: bds }) {
  const scores = React.useMemo(() => {
    if (!s || !s.nb) return null;
    const clamp = (v) => Math.max(0, Math.min(100, v));
    // 1. Spread-Niveau: low spread = good
    const spreadScore = clamp(100 - ((s.wS || 0) - 50) / 3);
    // 2. Duration: ~4 is ideal
    const durationScore = clamp(100 - Math.abs((s.wD || 0) - 4) * 15);
    // 3. Liquidität
    const liqScore = clamp(s.wL || 50);
    // 4. Rating quality (lower numeric = better)
    const ratingScore = clamp(s.wLn ? (1 - s.wLn / 20) * 100 : 50);
    // 5. Konzentration
    const hhi = s.ic ? calcHHI(s.ic, s.tN || 0) : 0;
    const concScore = clamp(100 - hhi / 30);
    // 6. Struktur-Risiko: less callable/perpetual = better
    const structScore = clamp(100 - ((s.callP || 0) + (s.perpP || 0)) * 100);
    const all = [
      { label: "Spread-Niveau",     icon: "📊", score: spreadScore,   desc: `Ø ${fxV(s.wS,0)} bp` },
      { label: "Duration-Profil",   icon: "⏱️", score: durationScore, desc: `Ø ${fxV(s.wD,1)} Jahre` },
      { label: "Liquiditäts-Score", icon: "💧", score: liqScore,      desc: `Ø LQA ${fxV(s.wL,0)}` },
      { label: "Rating-Qualität",   icon: "⭐", score: ratingScore,   desc: `Ø ${s.wLo || '-'}` },
      { label: "Konzentration",     icon: "🎯", score: concScore,     desc: `HHI ${fxV(hhi,0)}` },
      { label: "Struktur-Risiko",   icon: "🏗️", score: structScore,  desc: `${fxV((s.callP||0)*100,0)}% Call/Perp` },
    ];
    const overall = all.reduce((sum, g) => sum + g.score, 0) / all.length;
    return { gauges: all, overall };
  }, [s]);

  if (!scores) return <div className="text-slate-400 text-center py-8">Keine Daten</div>;

  const scoreColor = (v) => v >= 70 ? 'text-emerald-600' : v >= 40 ? 'text-amber-500' : 'text-rose-500';
  const scoreBg    = (v) => v >= 70 ? 'bg-emerald-50 border-emerald-200' : v >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';
  const scoreBar   = (v) => v >= 70 ? 'bg-emerald-500' : v >= 40 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div>
      <div className={`text-center p-4 rounded-xl border mb-4 ${scoreBg(scores.overall)}`}>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gesamt-Score</div>
        <div className={`text-4xl font-black ${scoreColor(scores.overall)}`}>{fxV(scores.overall,0)}</div>
        <div className="text-xs text-slate-400 mt-1">von 100 Punkten</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {scores.gauges.map(g => (
          <div key={g.label} className={`p-3 rounded-xl border ${scoreBg(g.score)}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{g.icon}</span>
              <span className="text-xs font-bold text-slate-700">{g.label}</span>
            </div>
            <div className={`text-2xl font-black ${scoreColor(g.score)}`}>{fxV(g.score,0)}</div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${scoreBar(g.score)}`}
                style={{ width: g.score + '%' }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{g.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
