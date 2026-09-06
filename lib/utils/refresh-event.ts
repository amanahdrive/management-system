'use client';

import React from 'react';

export const APP_REFRESH_EVENT = 'app:refresh-data';

/**
 * Dispatches a custom event across the window to notify all active client-side components
 * to immediately re-fetch their data.
 */
export function triggerAppRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(APP_REFRESH_EVENT, {
        detail: { timestamp: Date.now() },
      })
    );
  }
}

/**
 * React hook for client components to subscribe to app-wide data refresh events.
 * Executes the provided callback whenever a sync/refresh action is triggered anywhere in the app.
 */
export function useAppRefresh(onRefresh: () => void | Promise<void>): void {
  const onRefreshRef = React.useRef(onRefresh);

  React.useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  React.useEffect(() => {
    const handleRefresh = () => {
      if (onRefreshRef.current) {
        onRefreshRef.current();
      }
    };

    window.addEventListener(APP_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(APP_REFRESH_EVENT, handleRefresh);
    };
  }, []);
}
