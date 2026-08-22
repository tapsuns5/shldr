'use client';

import { type TravelStats } from '@/hooks/useTravelStats';

interface StatItemProps {
  value: string | number;
  label: string;
  darkMode?: boolean;
}

function StatItem({ value, label, darkMode }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[64px]">
      <span
        className="text-lg font-bold leading-tight tabular-nums"
        style={{ color: darkMode ? '#60a5fa' : '#2563eb' }}
      >
        {value}
      </span>
      <span
        className="text-[10px] font-medium uppercase tracking-wide leading-tight text-center"
        style={{ color: darkMode ? '#94a3b8' : '#64748b' }}
      >
        {label}
      </span>
    </div>
  );
}

function formatDistance(km: number): string {
  if (km === 0) return '—';
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  return `${km} km`;
}

interface MapStatsPanelProps {
  stats: TravelStats;
  darkMode?: boolean;
}

export default function MapStatsPanel({ stats, darkMode = false }: MapStatsPanelProps) {
  const bg = darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.88)';
  const border = darkMode ? '1px solid rgba(71,85,105,0.6)' : '1px solid rgba(203,213,225,0.8)';
  const divider = darkMode ? '#334155' : '#e2e8f0';

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center rounded-2xl shadow-xl overflow-hidden"
      style={{
        background: bg,
        border,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <StatItem value={stats.countriesCount} label="Countries" darkMode={darkMode} />
      <div style={{ width: 1, height: 32, background: divider }} />
      <StatItem value={stats.citiesCount} label="Cities" darkMode={darkMode} />
      <div style={{ width: 1, height: 32, background: divider }} />
      <StatItem value={stats.tripsCount} label="Trips" darkMode={darkMode} />
      <div style={{ width: 1, height: 32, background: divider }} />
      <StatItem value={stats.flightsCount} label="Flights" darkMode={darkMode} />
      <div style={{ width: 1, height: 32, background: divider }} />
      <StatItem value={formatDistance(stats.distanceKm)} label="Flown" darkMode={darkMode} />
      <div style={{ width: 1, height: 32, background: divider }} />
      <StatItem value={stats.continentsCount} label="Continents" darkMode={darkMode} />
    </div>
  );
}
