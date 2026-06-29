import { AvailabilityDay, AvailabilityTimeSlot } from '../types';

const DAY_DEFINITIONS = [
  { day: 1, label: '星期一' },
  { day: 2, label: '星期二' },
  { day: 3, label: '星期三' },
  { day: 4, label: '星期四' },
  { day: 5, label: '星期五' },
  { day: 6, label: '星期六' },
  { day: 0, label: '星期日' },
] as const;

export function createAvailabilitySlot(
  startTime = '09:00',
  endTime = '20:00',
  id = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
): AvailabilityTimeSlot {
  return { id, startTime, endTime };
}

export function createDefaultAvailability(): AvailabilityDay[] {
  return DAY_DEFINITIONS.map(({ day, label }) => ({
    day,
    label,
    isAvailable: false,
    slots: [createAvailabilitySlot('09:00', '20:00', `default-${day}`)],
  }));
}

function normalizeSlots(value: Record<string, unknown>, day: number): AvailabilityTimeSlot[] {
  if (Array.isArray(value.slots)) {
    const slots = value.slots.flatMap((slot, index) => {
      if (!slot || typeof slot !== 'object') return [];

      const candidate = slot as Record<string, unknown>;
      if (typeof candidate.startTime !== 'string' || typeof candidate.endTime !== 'string') return [];

      return [createAvailabilitySlot(
        candidate.startTime,
        candidate.endTime,
        typeof candidate.id === 'string' ? candidate.id : `saved-${day}-${index}`,
      )];
    });

    if (slots.length > 0) return slots;
  }

  // 相容舊版每天只有一組 startTime/endTime 的資料。
  if (typeof value.startTime === 'string' && typeof value.endTime === 'string') {
    return [createAvailabilitySlot(value.startTime, value.endTime, `legacy-${day}`)];
  }

  return [createAvailabilitySlot('09:00', '20:00', `default-${day}`)];
}

export function normalizeAvailability(value: unknown): AvailabilityDay[] {
  if (!Array.isArray(value)) return createDefaultAvailability();

  const savedDays = new Map<number, Record<string, unknown>>();
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;

    const candidate = item as Record<string, unknown>;
    if (typeof candidate.day === 'number') savedDays.set(candidate.day, candidate);
  });

  return DAY_DEFINITIONS.map(({ day, label }) => {
    const savedDay = savedDays.get(day);
    return {
      day,
      label,
      isAvailable: Boolean(savedDay?.isAvailable),
      slots: savedDay ? normalizeSlots(savedDay, day) : [createAvailabilitySlot('09:00', '20:00', `default-${day}`)],
    };
  });
}
