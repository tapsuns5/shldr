'use client';

import { useTravelMap, type MapView } from '../MapProvider';

interface MapViewToggleProps {
  darkMode?: boolean;
}

const views: { key: MapView; label: string }[] = [
  { key: 'footprints', label: 'Footprints' },
  { key: 'wishlist', label: 'Wishlist' },
];

export default function MapViewToggle({ darkMode = false }: MapViewToggleProps) {
  const { view, setView } = useTravelMap();

  const bg = darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.88)';
  const border = darkMode ? '1px solid rgba(71,85,105,0.6)' : '1px solid rgba(203,213,225,0.8)';
  const activeBg = darkMode ? '#1d4ed8' : '#2563eb';
  const inactiveColor = darkMode ? '#94a3b8' : '#64748b';

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center rounded-full overflow-hidden shadow-md"
      style={{
        background: bg,
        border,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        gap: 2,
        padding: 3,
      }}
    >
      {views.map((v) => {
        const active = view === v.key;
        return (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
            style={{
              background: active ? activeBg : 'transparent',
              color: active ? '#ffffff' : inactiveColor,
              cursor: 'pointer',
            }}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
