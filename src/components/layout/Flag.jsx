import React from 'react';

export const getFlag = (c) => {
  if (!c || c === "??" || c.length !== 2) return "🏳️";
  return String.fromCodePoint(c.toUpperCase().charCodeAt(0) + 127397, c.toUpperCase().charCodeAt(1) + 127397);
};

export default function Flag({ c, className = "w-3.5 h-2.5" }) {
  if (!c || c === "??" || c.length !== 2) return <span className="text-[10px]">🏳️</span>;
  return <img src={`https://flagcdn.com/w20/${c.toLowerCase()}.png`} alt={c} className={`inline-block object-cover rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.3)] ${className}`} />;
}
