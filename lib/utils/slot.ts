import { SlotWaktu } from '@/types/database';

/**
 * Returns all slot IDs occupied by a session.
 * If slotAkhir is missing, identical to slotAwal, or has urutan <= slotAwal,
 * only the start slot is returned.
 */
export function getSessionOccupiedSlotIds(
  slotAwalId?: string | null,
  slotAkhirId?: string | null,
  allSlots?: SlotWaktu[] | { id: string; urutan?: number }[]
): string[] {
  if (!slotAwalId) return [];
  if (!slotAkhirId || slotAkhirId === slotAwalId) return [slotAwalId];

  if (!allSlots || allSlots.length === 0) {
    return [slotAwalId];
  }

  const startSlot = allSlots.find((s) => s.id === slotAwalId);
  const endSlot = allSlots.find((s) => s.id === slotAkhirId);

  if (!startSlot || !endSlot) {
    return [slotAwalId];
  }

  const startUrutan = startSlot.urutan ?? 0;
  const endUrutan = endSlot.urutan ?? 0;

  // Invalid range: end slot is earlier than or equal to start slot
  if (endUrutan <= startUrutan) {
    return [slotAwalId];
  }

  // Multi-slot range: return all slots in between
  return allSlots
    .filter((s) => (s.urutan ?? 0) >= startUrutan && (s.urutan ?? 0) <= endUrutan)
    .map((s) => s.id);
}

/**
 * Validates whether slotAkhir is a legitimate contiguous forward extension of slotAwal.
 */
export function isSlotRangeValid(
  slotAwalId?: string | null,
  slotAkhirId?: string | null,
  allSlots?: SlotWaktu[] | { id: string; urutan?: number }[]
): boolean {
  if (!slotAwalId || !slotAkhirId || slotAkhirId === slotAwalId) return false;
  if (!allSlots || allSlots.length === 0) return false;

  const startSlot = allSlots.find((s) => s.id === slotAwalId);
  const endSlot = allSlots.find((s) => s.id === slotAkhirId);

  if (!startSlot || !endSlot) return false;
  return (endSlot.urutan ?? 0) > (startSlot.urutan ?? 0);
}

/**
 * Format slot time label cleanly without false range display.
 */
export function formatSlotLabel(
  slotAwal?: { nama_slot?: string; jam_mulai?: string; jam_selesai?: string; urutan?: number } | null,
  slotAkhir?: { nama_slot?: string; jam_mulai?: string; jam_selesai?: string; urutan?: number } | null
): string {
  if (!slotAwal) return '-';

  const isRange =
    slotAkhir &&
    slotAkhir.nama_slot &&
    (slotAkhir.urutan ?? 0) > (slotAwal.urutan ?? 0);

  if (isRange && slotAkhir) {
    const startStr = slotAwal.jam_mulai ? slotAwal.jam_mulai.substring(0, 5) : '';
    const endStr = slotAkhir.jam_selesai ? slotAkhir.jam_selesai.substring(0, 5) : '';
    return `${slotAwal.nama_slot} s/d ${slotAkhir.nama_slot} (${startStr} - ${endStr} WIB)`;
  }

  const startStr = slotAwal.jam_mulai ? slotAwal.jam_mulai.substring(0, 5) : '';
  const endStr = slotAwal.jam_selesai ? slotAwal.jam_selesai.substring(0, 5) : '';
  return `${slotAwal.nama_slot} (${startStr} - ${endStr} WIB)`;
}
