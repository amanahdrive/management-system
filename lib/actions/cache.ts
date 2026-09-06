'use server';

import { cacheInvalidateAll } from '@/lib/utils/cache';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to purge all in-memory query caches and revalidate all Next.js App Router paths.
 */
export async function purgeServerCache(): Promise<{ success: boolean; timestamp: number }> {
  try {
    // 1. Clear in-memory SQL query cache
    cacheInvalidateAll();

    // 2. Revalidate Next.js page paths
    try {
      revalidatePath('/', 'layout');
    } catch (e) {
      // Ignore if called in a context where revalidatePath is suppressed
    }

    return { success: true, timestamp: Date.now() };
  } catch (err) {
    console.error('Error purging server cache:', err);
    return { success: false, timestamp: Date.now() };
  }
}
