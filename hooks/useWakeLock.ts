import { useEffect, useRef } from 'react';

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (event: 'release', cb: () => void) => void;
};

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    const wakeLockApi = (navigator as any).wakeLock;
    if (!active || !wakeLockApi || typeof wakeLockApi.request !== 'function') {
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel: WakeLockSentinelLike = await wakeLockApi.request('screen');
        if (cancelled) {
          await sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
          }
        });
      } catch {
        // Permission denied, low battery, or page not visible — silently ignore.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        sentinel.release().catch(() => {});
      }
    };
  }, [active]);
}
