import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, MapPin, Users, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { format, isBefore, addMinutes, subMinutes, parse } from 'date-fns';
import { Lesson } from '../types';
import { cn } from '../lib/utils';
import { lessonsService } from '../services/lessonsService';

interface LessonCardProps {
  lesson: Lesson;
  onEdit?: () => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({ lesson, onEdit }) => {
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [isMissed, setIsMissed] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const lessonStart = parse(`${lesson.date} ${lesson.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const checkInStart = subMinutes(lessonStart, 15);
    const checkInEnd = addMinutes(lessonStart, 30);

    setCanCheckIn(isBefore(checkInStart, now) && isBefore(now, checkInEnd) && !lesson.checkedIn);
    setIsMissed(isBefore(checkInEnd, now) && !lesson.checkedIn);
  }, [now, lesson]);

  const handleCheckIn = async () => {
    if (lesson.checkedIn) return;
    try {
      await lessonsService.updateLesson(lesson.id, {
        checkedIn: true,
        checkInTime: new Date(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Approved': 'bg-green-100 text-green-700',
  };

  return (
    <div 
      className={cn(
        "bg-white rounded-xl p-3 border border-slate-200 transition-all relative overflow-hidden",
        lesson.checkedIn ? "bg-slate-50/50" : isMissed ? "border-red-200 bg-red-50/30" : "hover:border-slate-400",
        "shadow-sm"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">{lesson.startTime}</span>
          <div className="w-4 h-[1px] bg-slate-300" />
          <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">{lesson.endTime}</span>
        </div>
        <div className="flex gap-1.5 items-center">
          {lesson.adminNote && (
            <div className="bg-orange-100 p-1 rounded-md text-orange-600 animate-pulse">
              <AlertCircle size={14} />
            </div>
          )}
          <span className={cn(
            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
            lesson.status === 'Approved' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-yellow-50 text-yellow-600 border-yellow-200"
          )}>
            {lesson.status === 'Approved' ? '已核准' : '待審核'}
          </span>
          {onEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors shadow-sm"
              title="修改"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h3 className="font-black text-slate-900 text-sm">
            {lesson.coachName}
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">教練</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            <MapPin size={12} className="text-blue-500" />
            <span className="truncate">{lesson.poolType === '25m' ? `水道 ${lesson.lane}` : '教學小池'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            <Users size={12} className="text-purple-500" />
            <span className="truncate">{lesson.studentCount} 位學生</span>
          </div>
        </div>

        {lesson.studentNames && (
          <p className="text-slate-500 text-[10px] font-medium truncate lowercase italic border-t border-slate-100 pt-1 mt-1">
            {lesson.studentNames}
          </p>
        )}

        {lesson.adminNote && (
          <div className="mt-1 text-[9px] bg-orange-50 text-orange-700 p-1.5 rounded-lg border border-orange-100 font-bold leading-tight">
            管理員備註: {lesson.adminNote}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          {lesson.checkedIn ? (
            <div className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase tracking-tighter bg-green-50 px-2 py-1 rounded-md">
              <CheckCircle size={14} strokeWidth={3} />
              <span>已簽到 {format(lesson.checkInTime?.toDate?.() || new Date(lesson.checkInTime), 'HH:mm')}</span>
            </div>
          ) : isMissed ? (
            <div className="flex items-center gap-1 text-red-600 font-black text-[10px] uppercase tracking-tighter bg-red-50 px-2 py-1 rounded-md">
              <AlertCircle size={14} strokeWidth={3} />
              <span>缺簽</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-tighter">
              <Clock size={14} />
              <span>等待上課</span>
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCheckIn();
          }}
          disabled={lesson.checkedIn}
          className={cn(
            "h-8 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all",
            lesson.checkedIn 
              ? "bg-slate-200 text-slate-400" 
              : canCheckIn 
                ? "bg-primary text-slate-800 shadow-md shadow-primary/20 hover:scale-105 active:scale-95" 
                : "bg-primary text-slate-800 shadow-md shadow-primary/20 hover:scale-105 active:scale-95"
          )}
        >
          簽到
        </button>
      </div>
    </div>
  );
}
