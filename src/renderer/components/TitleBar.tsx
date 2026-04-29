import { Pin, PinOff, X } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../api';

export function TitleBar() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const hidePopover = useStore((s) => s.hidePopover);
  const mode = settings?.popoverMode ?? 'menubar';
  const isPinned = mode === 'pinned';

  const toggleMode = async () => {
    const next = isPinned ? 'menubar' : 'pinned';
    await setSettings({ popoverMode: next });
    await api.invoke('app:set-popover-mode', { mode: next });
  };

  return (
    <div
      className="flex h-6 items-center gap-1 border-b border-border-subtle px-2 text-fg-muted"
      // The whole strip is the drag region in pinned mode. In menubar mode the
      // window is auto-positioned, so we still allow drag (no harm, snaps back
      // next open).
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <span className="flex-1 select-none text-[10px] uppercase tracking-wider">
        goojira{isPinned && ' · pinned'}
      </span>
      <button
        onClick={() => void toggleMode()}
        // Buttons need to opt out of the drag region so clicks register.
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="rounded p-0.5 hover:bg-bg-hover hover:text-fg"
        title={isPinned ? 'Dock back to menubar (auto-hide on blur)' : 'Pin — keep open & draggable'}
      >
        {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
      </button>
      {isPinned && (
        <button
          onClick={hidePopover}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="rounded p-0.5 hover:bg-bg-hover hover:text-accent-red"
          title="Close (the app stays running in the menubar)"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
