import { useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { lessonsService } from '../services/lessonsService';
import { Lesson } from '../types';
import { getLessonCoachNames } from '../lib/scheduling';

interface WeeklyTimetableProps {
  isOpen: boolean;
  onClose: () => void;
  baseDate: string;
}

export const WEEK_DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'] as const;
export const TIMETABLE_HOURS = Array.from({ length: 12 }, (_, index) => `${String(index + 9).padStart(2, '0')}:00`);

type TimetableGroups = Map<string, Lesson[]>;

interface WeekRange {
  startOfWeek: Date;
  endOfWeek: Date;
}

export function getWeekRange(referenceDate = new Date()): WeekRange {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const currentDay = today.getDay();
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { startOfWeek: monday, endOfWeek: sunday };
}

function getGroupKey(dayIndex: number, hour: number) {
  return `${dayIndex}-${String(hour).padStart(2, '0')}:00`;
}

export function getLessonPoolLocation(lesson: Partial<Lesson>) {
  if (lesson.poolType === '25m') {
    return `25M 大池${lesson.lane ? ` 第${lesson.lane}道` : ''}`;
  }

  return lesson.poolType === 'Small' ? '小池' : '泳池未記錄';
}

export function groupLessonsByDayAndHour(lessons: Lesson[]): TimetableGroups {
  const groups: TimetableGroups = new Map();

  // JavaScript 的星期日為 0，轉換成星期一為 0 的課表索引。
  lessons.forEach((lesson) => {
    const lessonDate = parseISO(lesson.date);
    const dayIndex = (lessonDate.getDay() + 6) % 7;
    const startHour = Number(lesson.startTime.split(':')[0]);

    if (Number.isNaN(startHour) || startHour < 9 || startHour > 20) return;

    const key = getGroupKey(dayIndex, startHour);
    groups.set(key, [...(groups.get(key) ?? []), lesson]);
  });

  groups.forEach((group) => {
    group.sort((a, b) => a.startTime.localeCompare(b.startTime) || getLessonCoachNames(a).localeCompare(getLessonCoachNames(b)));
  });

  return groups;
}

export function WeeklyTimetable({ isOpen, onClose, baseDate }: WeeklyTimetableProps) {
  const [weekRange, setWeekRange] = useState<WeekRange>(() => getWeekRange(parseISO(baseDate)));
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekRange.startOfWeek, index)),
    [weekRange],
  );
  const groupedLessons = useMemo(() => groupLessonsByDayAndHour(lessons), [lessons]);

  useEffect(() => {
    if (isOpen) setWeekRange(getWeekRange(parseISO(baseDate)));
  }, [baseDate, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // 僅在總表開啟時訂閱目前顯示週次，切週時會自動清除舊訂閱。
    setIsLoading(true);
    const startDate = format(weekRange.startOfWeek, 'yyyy-MM-dd');
    const endDate = format(weekRange.endOfWeek, 'yyyy-MM-dd');
    const unsubscribe = lessonsService.subscribeToDateRange(startDate, endDate, (data) => {
      setLessons(data);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [isOpen, weekRange]);

  const changeWeek = (days: number) => {
    setWeekRange((currentRange) => getWeekRange(addDays(currentRange.startOfWeek, days)));
  };

  const handleThisWeek = () => {
    setWeekRange(getWeekRange(new Date()));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4">
          <motion.button
            type="button"
            aria-label="關閉一週總表"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2a0726]/75"
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="weekly-timetable-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[92vh] sm:max-w-7xl sm:rounded-lg"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#d5f4d8] text-[#2a0726]">
                  <CalendarDays size={21} />
                </div>
                <div className="min-w-0">
                  <h2 id="weekly-timetable-title" className="text-base font-black text-[#2a0726] sm:text-lg">一週課程總表</h2>
                  <p className="truncate text-xs font-bold text-slate-500">
                    {format(weekDates[0], 'yyyy/MM/dd')} - {format(weekDates[6], 'yyyy/MM/dd')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50">
                  <button type="button" aria-label="上一週" onClick={() => changeWeek(-7)} className="flex h-full w-10 items-center justify-center text-slate-600 hover:bg-white">
                    <ChevronLeft size={19} />
                  </button>
                  <button type="button" onClick={handleThisWeek} className="h-full border-x border-slate-200 px-3 text-xs font-black text-slate-700 hover:bg-white">
                    本週
                  </button>
                  <button type="button" aria-label="下一週" onClick={() => changeWeek(7)} className="flex h-full w-10 items-center justify-center text-slate-600 hover:bg-white">
                    <ChevronRight size={19} />
                  </button>
                </div>
                <button type="button" aria-label="關閉" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600">
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="relative flex-1 overflow-auto bg-slate-50 p-3 sm:p-5">
              <table className="w-full min-w-[1120px] table-fixed border-collapse border border-slate-300 bg-white text-left text-xs text-slate-700">
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 top-0 z-30 w-20 border border-slate-300 bg-amber-50 p-3 text-center font-black text-[#2a0726]">時間</th>
                    {weekDates.map((date, dayIndex) => (
                      <th key={format(date, 'yyyy-MM-dd')} scope="col" className="sticky top-0 z-20 border border-slate-300 bg-amber-50 p-3 text-center font-black text-[#2a0726]">
                        <span className="block">{WEEK_DAYS[dayIndex]}</span>
                        <span className="mt-1 block text-[10px] font-bold text-slate-500">{format(date, 'MM/dd')}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMETABLE_HOURS.map((hourLabel) => (
                    <tr key={hourLabel}>
                      <th scope="row" className="sticky left-0 z-10 w-20 border border-slate-300 bg-slate-100 p-3 text-center align-top font-black text-slate-700">{hourLabel}</th>
                      {WEEK_DAYS.map((day, dayIndex) => {
                        const cellLessons = groupedLessons.get(getGroupKey(dayIndex, Number(hourLabel.slice(0, 2)))) ?? [];

                        return (
                          <td key={`${day}-${hourLabel}`} className="h-20 whitespace-normal break-words border border-slate-300 p-2 align-top">
                            {cellLessons.map((lesson) => (
                              <div key={lesson.id} className="mb-2 border-l-2 border-emerald-400 pl-2 leading-5 last:mb-0">
                                <span className="font-black text-[#2a0726]">{getLessonCoachNames(lesson)}</span>{' '}
                                <span className="font-mono text-[11px] text-slate-500">{lesson.startTime}-{lesson.endTime}</span>
                                <span className="block text-slate-700">
                                  ({lesson.studentNames?.trim() || '未填學生姓名'} / {lesson.lessonType}) [{getLessonPoolLocation(lesson)}]
                                </span>
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
                  <span className="rounded-md bg-[#2a0726] px-4 py-2 text-xs font-bold text-white shadow-lg">正在載入本週課程...</span>
                </div>
              )}
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
