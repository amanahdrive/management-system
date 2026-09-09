import { dbQuery } from '@/lib/db';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  role?: string;
  channelId?: 'finance-money-in' | 'finance-urgent' | 'finance-daily' | string;
  priority?: 'default' | 'normal' | 'high';
}

export interface PushNotificationResult {
  success: boolean;
  totalDevices: number;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

/**
 * Sends a push notification to all active registered devices matching the target role (defaults to 'finance').
 * Uses the Expo Push Notification Service with high-priority Android channel support.
 */
export async function sendPushToRole(
  payload: PushNotificationPayload
): Promise<PushNotificationResult> {
  const {
    title,
    body,
    data = {},
    role = 'finance',
    channelId = 'finance-urgent',
    priority = 'high',
  } = payload;

  try {
    const devices = await dbQuery<{ token: string; id: string }>(
      `SELECT id, token FROM device_push_tokens WHERE role = $1 AND is_active = true`,
      [role]
    );

    if (!devices || devices.length === 0) {
      return {
        success: true,
        totalDevices: 0,
        sentCount: 0,
        failedCount: 0,
      };
    }

    const messages = devices.map((d) => ({
      to: d.token,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        timestamp: Date.now(),
      },
      channelId,
      priority,
      _displayInForeground: true,
    }));

    // Expo allows chunks of up to 100 messages
    const chunkSize = 100;
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const invalidTokens: string[] = [];

    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();

        if (result.data && Array.isArray(result.data)) {
          result.data.forEach((ticket: any, idx: number) => {
            const correspondingDevice = chunk[idx];
            if (ticket.status === 'ok') {
              sentCount++;
            } else if (ticket.status === 'error') {
              failedCount++;
              if (ticket.details?.error === 'DeviceNotRegistered') {
                invalidTokens.push(correspondingDevice.to);
              }
              errors.push(ticket.message || ticket.details?.error || 'Unknown push ticket error');
            }
          });
        } else {
          failedCount += chunk.length;
          errors.push(result.errors ? JSON.stringify(result.errors) : 'Unexpected response format');
        }
      } catch (chunkError: any) {
        failedCount += chunk.length;
        errors.push(chunkError?.message || 'Network error sending push chunk');
      }
    }

    // Automatically deactivate stale / uninstalled tokens
    if (invalidTokens.length > 0) {
      await dbQuery(
        `UPDATE device_push_tokens SET is_active = false, updated_at = NOW() WHERE token = ANY($1::text[])`,
        [invalidTokens]
      );
    }

    return {
      success: failedCount === 0,
      totalDevices: devices.length,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error('Error in sendPushToRole:', err);
    return {
      success: false,
      totalDevices: 0,
      sentCount: 0,
      failedCount: 0,
      errors: [err?.message || 'Failed to dispatch push notifications'],
    };
  }
}
