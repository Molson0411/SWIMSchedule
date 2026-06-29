import { useEffect, useMemo, useState } from 'react';
import { UsersRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { normalizeAvailability } from '../lib/availability';
import { usersService } from '../services/usersService';
import { UserProfile } from '../types';
import { TIMETABLE_HOURS, WEEK_DAYS } from './WeeklyTimetable';

interface CoachAvailabilityTimetableProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AvailabilityGridEntry {
  key: string;
  coachName: string;
  startTime: string;
  endTime: string;
}

type AvailabilityGrid = Map<string, AvailabilityGridEntry[]>;

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getCellKey(dayIndex: number, hourLabel: string) {
  return `${dayIndex}-${hourLabel}`;
}

export function groupCoachAvailability(users: UserProfile[]): AvailabilityGrid {
  const grid: AvailabilityGrid = new Map();

  users
    .filter((user) => user.role === 'Coach')
    .forEach((user) => {
      const coachName = user.displayName?.trim() || user.email || '未命名教練';

      normalizeAvailability(user.availability).forEach((day) => {
        if (!day.isAvailable) return;

        const dayIndex = (day.day + 6) % 7;
        day.slots.forEach((slot) => {
          const slotStart = timeToMinutes(slot.startTime);
          const slotEnd = timeToMinutes(slot.endTime);
          if (!Number.isFinite(slotStart) || !Number.isFinite(slotEnd) || slotStart >= slotEnd) return;

          TIMETABLE_HOURS.forEach((hourLabel) => {
            const hourStart = timeToMinutes(hourLabel);
            const hourEnd = hourStart + 60;
            if (slotStart >= hourEnd || slotEnd <= hourStart) return;

            const cellKey = getCellKey(dayIndex, hourLabel);
            const entries = grid.get(cellKey) ?? [];
            entries.push({
              key: `${user.uid}-${day.day}-${slot.id}`,
              coachName,
              startTime: slot.startTime,
              endTime: slot.endTime,
            });
            grid.set(cellKey, entries);
          });
        });
      });
    });

  grid.forEach((entries) => {
    entries.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.coachName.localeCompare(b.coachName));
  });

  return grid;
}

export function CoachAvailabilityTimetable({ isOpen, onClose }: CoachAvailabilityTimetableProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availabilityGrid = useMemo(() => groupCoachAvailability(users), [users]);
  const coachCount = users.filter((user) => user.role === 'Coach').length;

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);
    const unsubscribe = usersService.subscribeToUsers(
      (data) => {
        setUsers(data);
        setIsLoading(false);
      },
      () => {
        setUsers([]);
        setIsLoading(false);
        setError('讀取教練空檔失敗，請稍後再試。');
      },
    );

    return unsubscribe;
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4">
          <motion.button
            type="button"
            aria-label="關閉教練空檔總表"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2a0726]/75"
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-availability-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[92vh] sm:max-w-7xl sm:rounded-lg"
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#d5f4d8] text-[#2a0726]">
                  <UsersRound size={21} />
                </div>
                <div className="min-w-0">
                  <h2 id="coach-availability-title" className="text-base font-black text-[#2a0726] sm:text-lg">教練可排課時間總表</h2>
                  <p className="truncate text-xs font-bold text-slate-500">共 {coachCount} 位教練</p>
                </div>
              </div>
              <button type="button" aria-label="關閉" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600">
                <X size={20} />
              </button>
            </header>

            <div className="relative flex-1 overflow-auto bg-slate-50 p-3 sm:p-5">
              {error && <div className="mb-3 border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

              <table className="w-full min-w-[1120px] table-fixed border-collapse border border-slate-300 bg-white text-left text-xs text-slate-700">
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 top-0 z-30 w-20 border border-slate-300 bg-amber-50 p-3 text-center font-black text-[#2a0726]">時間</th>
                    {WEEK_DAYS.map((day) => (
                      <th key={day} scope="col" className="sticky top-0 z-20 border border-slate-300 bg-amber-50 p-3 text-center font-black text-[#2a0726]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMETABLE_HOURS.map((hourLabel) => (
                    <tr key={hourLabel}>
                      <th scope="row" className="sticky left-0 z-10 w-20 border border-slate-300 bg-slate-100 p-3 text-center align-top font-black text-slate-700">{hourLabel}</th>
                      {WEEK_DAYS.map((day, dayIndex) => {
                        const entries = availabilityGrid.get(getCellKey(dayIndex, hourLabel)) ?? [];

                        return (
                          <td key={`${day}-${hourLabel}`} className="h-20 whitespace-normal break-words border border-slate-300 p-2 align-top">
                            {entries.map((entry) => (
                              <div key={entry.key} className="mb-2 border-l-2 border-emerald-400 pl-2 leading-5 last:mb-0">
                                <span className="font-black text-[#2a0726]">{entry.coachName}</span>
                                <span className="block font-mono text-[10px] text-slate-500">{entry.startTime}-{entry.endTime}</span>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {isLoading && (
                <div className="pointer-events-none sticky bottom-2 mt-[-40px] flex justify-center">
                  <span className="rounded-md bg-[#2a0726] px-4 py-2 text-xs font-bold text-white shadow-lg">正在載入教練空檔...</span>
                </div>
              )}
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
