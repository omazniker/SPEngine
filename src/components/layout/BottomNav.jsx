import React from 'react';

/**
 * Mobile bottom navigation bar.
 *
 * Props:
 *   visibleTabs      - array of { id, label, icon } tab descriptors (same shape used by the top navbar)
 *   tab              - currently active tab id
 *   setTab           - setter to change the active tab
 *   savedScenarios   - array of saved scenarios (used for badge count on tab id 4)
 */
export default function BottomNav({ visibleTabs, tab, setTab, savedScenarios }) {
  const navItems = [
    ...visibleTabs.map(t => ({
      id: t.id,
      label: t.label.split("-")[0].trim().slice(0, 10),
      icon: t.icon,
    })),
    { id: 10, label: "Settings", icon: "⚙" },
  ];

  return (
    <div className="md:hidden bottom-nav-modern">
      <div className="flex justify-around items-center px-2 pt-2 pb-1" role="tablist" aria-label="Hauptnavigation">
        {navItems.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            role="tab"
            aria-selected={tab === t.id}
            aria-label={t.label}
            className={"nav-item " + (tab === t.id ? "active" : "")}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="nav-pill"></div>
            <span className="nav-icon" aria-hidden="true">{t.icon}</span>
            <span className={"nav-label " + (tab === t.id ? "text-spark-600" : "text-slate-500")}>{t.label}</span>
            {t.id === 4 && savedScenarios.length > 0 && (
              <span className="nav-badge">{savedScenarios.length}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
