import { addMinutes, format, isWithinInterval, parse } from 'date-fns';
import { Lesson, PoolType } from '../types';

export const POOL_LIMITS = {
  '25m': { maxPerLane: 8, lanes: 6 },
  'Small': { maxTotal: 30 }
};

export const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9; // Start from 09:00
  const minute = (i % 2) * 30;
  return format(parse(`${hour}:${minute}`, 'H:m', new Date()), 'HH:mm');
});

export const isLessonInSlot = (lesson: Lesson, slot: string) => {
  return slot >= lesson.startTime && slot < lesson.endTime;
};

export const getEndTime = (startTime: string, durationMinutes: number) => {
  const start = parse(startTime, 'HH:mm', new Date());
  return format(addMinutes(start, durationMinutes), 'HH:mm');
};

export const getDurationHours = (start: string, end: string) => {
  const s = parse(start, 'HH:mm', new Date());
  const e = parse(end, 'HH:mm', new Date());
  return (e.getTime() - s.getTime()) / (1000 * 60 * 60);
};

/**
 * Checks if a new lesson conflicts with existing ones.
 * Returns true if there's a conflict.
 */
export function checkCollision(
  newLesson: Partial<Lesson>,
  existingLessons: Lesson[]
): { conflict: boolean; message?: string } {
  const { date, startTime, endTime, poolType, lane, studentCount } = newLesson;
  if (!date || !startTime || !endTime || !poolType || !studentCount) return { conflict: false };

  // Convert to date objects for comparison
  const newStart = parse(`${date} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const newEnd = parse(`${date} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());

  const overlappingLessons = existingLessons.filter(l => {
    if (l.date !== date) return false;
    if (l.id === newLesson.id) return false; // Ignore self if editing

    const lStart = parse(`${l.date} ${l.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const lEnd = parse(`${l.date} ${l.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

    return (
      isWithinInterval(newStart, { start: lStart, end: addMinutes(lEnd, -1) }) ||
      isWithinInterval(addMinutes(newEnd, -1), { start: lStart, end: addMinutes(lEnd, -1) }) ||
      (lStart >= newStart && lEnd <= newEnd)
    );
  });

  if (poolType === '25m') {
    if (!lane) return { conflict: true, message: '請選擇水道' };
    const laneLessons = overlappingLessons.filter(l => l.poolType === '25m' && l.lane === lane);
    const currentCount = laneLessons.reduce((acc, l) => acc + l.studentCount + 1, 0); // +1 for coach
    const totalWithNew = currentCount + studentCount + 1;

    if (totalWithNew > POOL_LIMITS['25m'].maxPerLane) {
      return { conflict: true, message: `第 ${lane} 水道人數已達上限 (${currentCount}/${POOL_LIMITS['25m'].maxPerLane})` };
    }
  } else {
    const smallPoolLessons = overlappingLessons.filter(l => l.poolType === 'Small');
    const currentCount = smallPoolLessons.reduce((acc, l) => acc + l.studentCount + 1, 0);
    const totalWithNew = currentCount + studentCount + 1;

    if (totalWithNew > POOL_LIMITS['Small'].maxTotal) {
      return { conflict: true, message: `小池人數已達上限 (${currentCount}/${POOL_LIMITS['Small'].maxTotal})` };
    }
  }

  return { conflict: false };
}
