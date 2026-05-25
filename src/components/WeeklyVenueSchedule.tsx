import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'date-fns';
import { POOL_LIMITS, TIME_SLOTS, isLessonInSlot } from '../lib/scheduling';
import { Lesson } from '../types';
import { lessonsService } from '../services/lessonsService';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, Clock, Waves, Users } from 'lucide-react';
import { cn } from '../lib/utils';

interface WeeklyVenueScheduleProps {
  isOpen: boolean;
  onClose: () => void;
  baseDate: string; // The date from which we calculate the week
}

export function WeeklyVenueSchedule({ isOpen, onClose, baseDate }: WeeklyVenueScheduleProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(parseISO(baseDate));
  
  const startDate = startOfWeek(viewDate, { weekStartsOn: 1 }); // Start Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const endDate = weekDays[6];

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      
      const unsubscribe = lessonsService.subscribeToDateRange(startStr, endStr, (data) => {
        setLessons(data);
        setLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, [isOpen, viewDate]);

  const getSlotStatus = (date: Date, slot: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotLessons = lessons.filter(l => l.date === dateStr && isLessonInSlot(l, slot));
    
    if (slotLessons.length === 0) return null;
    
    const mainPoolLoad = slotLessons
      .filter(l => l.poolType === '25m')
      .reduce((acc, l) => acc + l.studentCount + 1, 0);
    
    const smallPoolLoad = slotLessons
      .filter(l => l.poolType === 'Small')
      .reduce((acc, l) => acc + l.studentCount + 1, 0);

    return { mainPoolLoad, smallPoolLoad, lessons: slotLessons };
  };

  const [selectedDetails, setSelectedDetails] = useState<{
    title: string;
    lessons: Lesson[];
  } | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full h-full sm:h-[90vh] max-w-6xl bg-bg-ivory sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-primary/20">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">全場館週視圖</h2>
              <p className="text-xs font-bold text-slate-400 font-mono">Venue Weekly Load Distribution</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewDate(addDays(viewDate, -7))}
                className="p-2 hover:bg-white rounded-lg transition-all active:scale-90"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 text-xs font-black font-mono">
                {format(startDate, 'MM/dd')} - {format(endDate, 'MM/dd')}
              </span>
              <button 
                onClick={() => setViewDate(addDays(viewDate, 7))}
                className="p-2 hover:bg-white rounded-lg transition-all active:scale-90"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 ml-2"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="flex-1 overflow-auto p-4">
          <div className="min-w-[800px] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header Row */}
            <div className="grid grid-cols-[100px_repeat(7,1fr)] bg-slate-50 border-b border-slate-200">
              <div className="p-4 border-r border-slate-200 flex items-center justify-center">
                <Clock size={16} className="text-slate-400" />
              </div>
              {weekDays.map((date, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "p-4 text-center border-r border-slate-200 last:border-r-0",
                    isSameDay(date, new Date()) ? "bg-primary/5" : ""
                  )}
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {format(date, 'EEE')}
                  </p>
                  <p className={cn(
                    "text-lg font-black font-mono",
                    isSameDay(date, new Date()) ? "text-primary" : "text-slate-700"
                  )}>
                    {format(date, 'MM/dd')}
                  </p>
                </div>
              ))}
            </div>

            {/* Time Rows */}
            <div className="divide-y divide-slate-100">
              {TIME_SLOTS.map((slot) => (
                <div key={slot} className="grid grid-cols-[100px_repeat(7,1fr)] group">
                  <div className="p-3 border-r border-slate-200 bg-slate-50/50 flex items-center justify-center">
                    <span className="text-xs font-black text-slate-400 font-mono">{slot}</span>
                  </div>
                  {weekDays.map((date, i) => {
                    const status = getSlotStatus(date, slot);
                    const isToday = isSameDay(date, new Date());
                    
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "p-1 min-h-[60px] border-r border-slate-100 last:border-r-0 transition-colors group-hover:bg-slate-50/30",
                          isToday && "bg-primary/[0.02]"
                        )}
                      >
                        {status && (
                          <button
                            onClick={() => setSelectedDetails({ 
                              title: `${format(date, 'MM/dd')} ${slot}`, 
                              lessons: status.lessons 
                            })}
                            className="w-full h-full flex flex-col gap-1 p-1.5 rounded-xl border border-slate-200/50 bg-white shadow-sm hover:border-primary transition-all active:scale-95"
                          >
                            {status.mainPoolLoad > 0 && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Waves size={10} className="text-blue-500" />
                                  <span className="text-[9px] font-black text-slate-400">MAIN</span>
                                </div>
                                <span className={cn(
                                  "text-[9px] font-bold font-mono px-1 rounded",
                                  status.mainPoolLoad >= 40 ? "bg-red-50 text-red-500" : "text-slate-600"
                                )}>
                                  {status.mainPoolLoad}
                                </span>
                              </div>
                            )}
                            {status.smallPoolLoad > 0 && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Users size={10} className="text-orange-400" />
                                  <span className="text-[9px] font-black text-slate-400">SMALL</span>
                                </div>
                                <span className={cn(
                                  "text-[9px] font-bold font-mono px-1 rounded",
                                  status.smallPoolLoad >= 25 ? "bg-red-50 text-red-500" : "text-slate-600"
                                )}>
                                  {status.smallPoolLoad}
                                </span>
                              </div>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">25m 標準池 (上限 48)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">教學小池 (上限 30)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">高負載警示</span>
          </div>
        </div>
      </motion.div>

      {/* Details Overlay (copied from PoolMonitor logic) */}
      <AnimatePresence>
        {selectedDetails && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetails(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div>
                  <h4 className="text-lg font-black text-slate-800">{selectedDetails.title}</h4>
                  <p className="text-xs font-bold text-slate-400 font-mono tracking-widest">排課名單詳情</p>
                </div>
                <button 
                  onClick={() => setSelectedDetails(null)}
                  className="p-2 rounded-full bg-slate-100 text-slate-500 active:scale-95 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {selectedDetails.lessons.map((lesson, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-black text-slate-800">{lesson.coachName}</p>
                        <span className="text-[10px] font-bold text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100">
                          {lesson.startTime} - {lesson.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500 tracking-tighter">
                          {lesson.lessonType} ({lesson.poolType === '25m' ? `大池 L${lesson.lane}` : '小池'})
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          學生: {lesson.studentCount} 人
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-black text-slate-300 font-mono">
                        {lesson.studentCount + 1}
                      </span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">總負荷</span>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setSelectedDetails(null)}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] mt-8 active:scale-95 transition-all"
              >
                關閉
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
