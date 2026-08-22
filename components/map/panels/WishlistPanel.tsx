'use client';

import { useState } from 'react';
import { type WishlistDestination } from '@/hooks/useTravelMapData';
import AddWishlistDialog from '../dialogs/AddWishlistDialog';

interface WishlistPanelProps {
  accountId: string;
  items: WishlistDestination[];
  darkMode?: boolean;
  onAdded: (item: WishlistDestination) => void;
  onRemoved: (id: string) => void;
  onSelect: (item: WishlistDestination) => void;
}

function WishlistRow({
  item,
  darkMode,
  onDelete,
  onSelect,
}: {
  item: WishlistDestination;
  darkMode: boolean;
  onDelete: (id: string) => void;
  onSelect: (item: WishlistDestination) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const label = item.type === 'country' ? item.country : `${item.city}, ${item.country}`;
  const hasCoords = item.lat != null && item.lng != null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      const response = await fetch(`/api/wishlist?id=${item.id}`, { method: 'DELETE' });
      if (response.ok) onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={() => hasCoords && onSelect(item)}
      className="flex items-start justify-between gap-2 px-3 py-2"
      style={{
        borderBottom: darkMode ? '1px solid rgba(71,85,105,0.4)' : '1px solid rgba(226,232,240,0.8)',
        cursor: hasCoords ? 'pointer' : 'default',
      }}
    >
      <div className="min-w-0">
        <p
          className="text-xs font-semibold leading-tight truncate"
          style={{ color: darkMode ? '#e2e8f0' : '#1e293b' }}
        >
          {label}
        </p>
        {item.note && (
          <p
            className="text-[11px] leading-tight mt-0.5 truncate"
            style={{ color: darkMode ? '#94a3b8' : '#64748b' }}
          >
            {item.note}
          </p>
        )}
        <span
          className="inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
          style={
            item.visited
              ? { background: darkMode ? 'rgba(59,130,246,0.2)' : '#dbeafe', color: darkMode ? '#93c5fd' : '#2563eb' }
              : { background: darkMode ? 'rgba(148,163,184,0.2)' : '#f1f5f9', color: darkMode ? '#94a3b8' : '#64748b' }
          }
        >
          {item.visited ? 'Visited' : 'Not visited'}
        </span>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 text-[11px] font-medium"
        style={{ color: darkMode ? '#f87171' : '#dc2626', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
      >
        Remove
      </button>
    </div>
  );
}

export default function WishlistPanel({ accountId, items, darkMode = false, onAdded, onRemoved, onSelect }: WishlistPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const bg = darkMode ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)';
  const border = darkMode ? '1px solid rgba(71,85,105,0.6)' : '1px solid rgba(203,213,225,0.8)';

  const notVisited = items.filter((i) => !i.visited);
  const visited = items.filter((i) => i.visited);

  return (
    <>
      <div
        className="absolute top-20 left-4 z-10 w-64 rounded-2xl shadow-xl flex flex-col max-h-[60vh]"
        style={{
          background: bg,
          border,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: darkMode ? '1px solid rgba(71,85,105,0.5)' : '1px solid rgba(226,232,240,0.9)' }}
        >
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: darkMode ? '#e2e8f0' : '#1e293b' }}
          >
            Bucket List ({visited.length}/{items.length} visited)
          </span>
          <button
            onClick={() => setDialogOpen(true)}
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              background: darkMode ? '#1d4ed8' : '#2563eb',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            + Add
          </button>
        </div>

        <div className="overflow-y-auto">
          {items.length === 0 && (
            <p
              className="text-xs px-3 py-4 text-center"
              style={{ color: darkMode ? '#64748b' : '#94a3b8' }}
            >
              No destinations yet. Add a city or country you want to visit.
            </p>
          )}
          {notVisited.map((item) => (
            <WishlistRow key={item.id} item={item} darkMode={darkMode} onDelete={onRemoved} onSelect={onSelect} />
          ))}
          {visited.map((item) => (
            <WishlistRow key={item.id} item={item} darkMode={darkMode} onDelete={onRemoved} onSelect={onSelect} />
          ))}
        </div>
      </div>

      <AddWishlistDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        accountId={accountId}
        onAdded={onAdded}
      />
    </>
  );
}
