import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TIME_SLOTS, isLessonInSlot } from '../lib/scheduling';
import { Lesson } from '../types';
import { cn } from '../lib/utils';
import { Waves, Users, Info, X, Clock } from 'lucide-react';

interface PoolMonitorProps {
  lessons: Lesson[];
}

export function PoolMonitor({ lessons }: PoolMonitorProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<{
    title: string;
    lessons: Lesson[];
  } | null>(null);

  const getSlotData = (slot: string) => {
    const activeLessons = lessons.filter(l => isLessonInSlot(l, slot));
    
    const laneCounts = [1, 2, 3, 4, 5, 6].map(lane => {
      const laneLessons = activeLessons.filter(l => l.poolType === '25m' && l.lane === lane);
      return {
        lane,
        lessons: laneLessons,
        count: laneLessons.reduce((acc, l) => acc + l.studentCount + 1, 0)
      };
    });

    const smallPoolLessons = activeLessons.filter(l => l.poolType === 'Small');
    const smallPoolCount = smallPoolLessons.reduce((acc, l) => acc + l.studentCount + 1, 0);

    return { activeLessons, laneCounts, smallPoolLessons, smallPoolCount };
  };

  return (
    <div className="space-y-4">
      {/* List of all time slots */}
      <div className="space-y-3">
        {TIME_SLOTS.map((slot) => {
          const { laneCounts, smallPoolCount } = getSlotData(slot);
          const totalMainPoolLoad = laneCounts.reduce((a, b) => a + b.count, 0);
          const mainPoolPercent = (totalMainPoolLoad / 48) * 100;
          const smallPoolPercent = (smallPoolCount / 30) * 100;

          const hasLessons = totalMainPoolLoad > 0 || smallPoolCount > 0;

          return (
            <motion.div 
              key={slot}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-white rounded-2xl p-4 shadow-sm border transition-all",
                hasLessons ? "border-slate-200" : "border-slate-100 opacity-60"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-sm font-black text-slate-700 font-mono">{slot}</span>
                </div>
                {hasLessons && (
                  <button 
                    onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                    className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    {selectedSlot === slot ? '收合詳情' : '查看分佈'}
                  </button>
                )}
              </div>

              {/* Load Bars Summary */}
              <div className="grid grid-cols-2 gap-4">
                {/* Main Pool summary */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-0.5">
                    <div className="flex items-center gap-1">
                      <Waves size={10} className="text-blue-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Main Pool</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 font-mono">{totalMainPoolLoad}/48</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        mainPoolPercent > 80 ? "bg-red-400" : "bg-blue-400"
                      )}
                      style={{ width: `${Math.min(mainPoolPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Small Pool summary */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-0.5">
                    <div className="flex items-center gap-1">
                      <Users size={10} className="text-orange-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Small Pool</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 font-mono">{smallPoolCount}/30</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        smallPoolPercent > 80 ? "bg-red-400" : "bg-orange-400"
                      )}
                      style={{ width: `${Math.min(smallPoolPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Distribution Diagram (Compact version) */}
              <AnimatePresence>
                {selectedSlot === slot && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-slate-100"
                  >
                    <div className="space-y-4">
                      {/* Main Pool Grid */}
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/50">
                        <div className="grid grid-cols-6 gap-2">
                          {laneCounts.map(({ lane, count, lessons: laneLessons }) => {
                            const p = (count / 8) * 100;
                            return (
                              <button 
                                key={lane}
                                onClick={() => setSelectedDetails({ title: `${slot} 第 ${lane} 水道`, lessons: laneLessons })}
                                className="flex flex-col items-center gap-1 group"
                              >
                                <div className="w-full h-12 bg-white rounded-lg border border-slate-200 relative overflow-hidden flex flex-col justify-end group-hover:border-primary transition-all">
                                  <div 
                                    className={cn(
                                      "transition-all duration-500",
                                      p > 90 ? "bg-red-400" : "bg-blue-400"
                                    )}
                                    style={{ height: `${Math.min(p, 100)}%` }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-300 drop-shadow-sm group-hover:text-primary">
                                    {count}
                                  </span>
                                </div>
                                <span className="text-[8px] font-black text-slate-400">L{lane}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Small Pool Visual */}
                      <button 
                        onClick={() => setSelectedDetails({ title: `${slot} 教學小池`, lessons: getSlotData(slot).smallPoolLessons })}
                        className="w-full text-left bg-slate-50 rounded-2xl p-3 border border-slate-200/50 group"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Small Pool Intensity</span>
                          <Info size={10} className="text-slate-300 group-hover:text-primary" />
                        </div>
                        <div className="grid grid-cols-10 gap-1.5">
                          {Array.from({ length: 30 }).map((_, idx) => (
                            <div 
                              key={idx} 
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                idx < smallPoolCount 
                                  ? (smallPoolCount > 25 ? "bg-red-400" : "bg-orange-400") 
                                  : "bg-white border border-slate-200"
                              )}
                            />
                          ))}
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Details Overlay (reused from previous version) */}
      <AnimatePresence>
        {selectedDetails && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-4">
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
                {selectedDetails.lessons.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-slate-400 text-sm font-bold">此時段尚無安排課程</p>
                  </div>
                ) : (
                  selectedDetails.lessons.map((lesson, idx) => (
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
                            {lesson.lessonType}
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
                  ))
                )}
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
