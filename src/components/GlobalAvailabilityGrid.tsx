import { UsersRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { normalizeAvailability } from '../lib/availability';
import { UserProfile } from '../types';
import { TIMETABLE_HOURS, WEEK_DAYS } from './WeeklyTimetable';

interface GlobalAvailabilityGridProps {
  isOpen: boolean;
  onClose: () => void;
  coaches: UserProfile[];
}

interface AvailableCoach {
  uid: string;
  coachName: string;
}

const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const;

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getAvailableCoaches(coachesList: UserProfile[], day: number, time: string): AvailableCoach[] {
  const targetMinutes = timeToMinutes(time);
  if (!Number.isFinite(targetMinutes)) return [];

  return coachesList
    .filter((coach) => {
      const dayAvailability = normalizeAvailability(coach.availability).find(
        (availabilityDay) => availabilityDay.day === day && availabilityDay.isAvailable,
      );

      return dayAvailability?.slots.some((slot) => {
        const startMinutes = timeToMinutes(slot.startTime);
        const endMinutes = timeToMinutes(slot.endTime);
        return Number.isFinite(startMinutes)
          && Number.isFinite(endMinutes)
          && startMinutes <= targetMinutes
          && targetMinutes < endMinutes;
      });
    })
    .map((coach) => ({
      uid: coach.uid,
      coachName: coach.displayName?.trim() || coach.email || '未命名教練',
    }))
    .sort((a, b) => a.coachName.localeCompare(b.coachName));
}

export function GlobalAvailabilityGrid({ isOpen, onClose, coaches }: GlobalAvailabilityGridProps) {
  const coachesList = coaches.filter(
    (coach) => Array.isArray(coach.availability) && coach.availability.length > 0,
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4">
          <motion.button
            type="button"
            aria-label="關閉全局教練空檔總表"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2a0726]/75"
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-availability-title"
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
                  <h2 id="global-availability-title" className="text-base font-black text-[#2a0726] sm:text-lg">全局教練空檔總表</h2>
                  <p className="truncate text-xs font-bold text-slate-500">共 {coachesList.length} 位已設定空檔的教練</p>
                </div>
              </div>
              <button type="button" aria-label="關閉" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600">
                <X size={20} />
              </button>
            </header>

            <div className="relative flex-1 overflow-auto bg-slate-50 p-3 sm:p-5">
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
                        const availableCoaches = getAvailableCoaches(coachesList, DAY_VALUES[dayIndex], hourLabel);

                        return (
                          <td key={`${day}-${hourLabel}`} className="h-20 whitespace-normal break-words border border-slate-300 p-2 align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {availableCoaches.map((coach) => (
                                <span key={coach.uid} className="inline-flex rounded-md bg-[#d5f4d8] px-2 py-1 text-[10px] font-black text-[#2a0726]">
                                  {coach.coachName}
                                </span>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
