import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Edit2, MapPin, Users } from 'lucide-react';
import { format, isValid, parse, subMinutes } from 'date-fns';
import { Lesson } from '../types';
import { cn } from '../lib/utils';
import { lessonsService } from '../services/lessonsService';
import { getLessonCoachNames } from '../lib/scheduling';

interface LessonCardProps {
  lesson: Lesson;
  currentUserId?: string;
  onEdit?: () => void;
}

type CheckInWindowState = 'checked-in' | 'available' | 'before' | 'missed' | 'unknown';

function getCheckInWindowState(lesson: Lesson, now: Date): CheckInWindowState {
  if (lesson.checkedIn) return 'checked-in';

  try {
    if (!lesson.date || !lesson.startTime || !isValid(now)) return 'unknown';

    const lessonStart = parse(`${lesson.date} ${lesson.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const checkInStart = subMinutes(lessonStart, 15);
    const checkInEnd = parse(`${lesson.date} 23:59:59`, 'yyyy-MM-dd HH:mm:ss', new Date());

    if (![lessonStart, checkInStart, checkInEnd].every(isValid)) return 'unknown';

    const nowTime = now.getTime();
    if (nowTime < checkInStart.getTime()) return 'before';
    if (nowTime > checkInEnd.getTime()) return 'missed';
    return 'available';
  } catch (error) {
    console.error('Failed to calculate lesson check-in status:', error, lesson.id);
    return 'unknown';
  }
}

function formatCheckInTime(checkInTime: Lesson['checkInTime']) {
  try {
    if (!checkInTime) return '時間未記錄';

    const parsedTime = typeof checkInTime.toDate === 'function' ? checkInTime.toDate() : new Date(checkInTime);
    return isValid(parsedTime) ? format(parsedTime, 'HH:mm') : '時間未記錄';
  } catch (error) {
    console.error('Failed to format lesson check-in time:', error);
    return '時間未記錄';
  }
}

export const LessonCard: React.FC<LessonCardProps> = ({ lesson, currentUserId, onEdit }) => {
  const [now, setNow] = useState(new Date());
  const isOwner = Boolean(currentUserId && lesson.coachId === currentUserId);
  const checkInState = getCheckInWindowState(lesson, now);
  const canCheckIn = checkInState === 'available';
  const isBeforeCheckIn = checkInState === 'before';
  const isMissed = checkInState === 'missed';
  const isUnknown = checkInState === 'unknown';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
    if (!isOwner) {
      window.alert('權限不足：您只能更改自己的排課資料！');
      return;
    }

    if (!canCheckIn) return;

    try {
      await lessonsService.updateLesson(lesson.id, {
        checkedIn: true,
        checkInTime: new Date(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl p-3 border border-slate-200 transition-all relative overflow-hidden shadow-sm',
        lesson.checkedIn ? 'bg-slate-50/50' : isMissed ? 'border-red-200 bg-red-50/30' : 'hover:border-slate-400',
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">{lesson.startTime || '--:--'}</span>
          <div className="w-4 h-[1px] bg-slate-300" />
          <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">{lesson.endTime || '--:--'}</span>
        </div>
        <div className="flex gap-1.5 items-center">
          {lesson.adminNote && (
            <div className="bg-orange-100 p-1 rounded-md text-orange-600 animate-pulse">
              <AlertCircle size={14} />
            </div>
          )}
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border',
              lesson.status === 'Approved'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-yellow-50 text-yellow-600 border-yellow-200',
            )}
          >
            {lesson.status === 'Approved' ? '已核准' : '待審核'}
          </span>
          {isOwner && onEdit && (
            <button
              onClick={(event) => {
                event.stopPropagation();
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
          <h3 className="font-black text-slate-900 text-sm">{getLessonCoachNames(lesson)}</h3>
          <span className="text-[10px] text-slate-400 font-medium">授課教練</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            <MapPin size={12} className="text-blue-500" />
            <span className="truncate">{lesson.poolType === '25m' ? `25m 第 ${lesson.lane ?? '-'} 道` : lesson.poolType === 'Small' ? '小泳池' : '泳池未記錄'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            <Users size={12} className="text-purple-500" />
            <span className="truncate">{lesson.studentCount ?? 0} 位學生</span>
          </div>
        </div>

        {lesson.studentNames && (
          <p className="text-slate-500 text-[10px] font-medium truncate lowercase italic border-t border-slate-100 pt-1 mt-1">
            {lesson.studentNames}
          </p>
        )}

        {lesson.adminNote && (
          <div className="mt-1 text-[9px] bg-orange-50 text-orange-700 p-1.5 rounded-lg border border-orange-100 font-bold leading-tight">
            管理備註：{lesson.adminNote}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          {lesson.checkedIn ? (
            <div className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase tracking-tighter bg-green-50 px-2 py-1 rounded-md">
              <CheckCircle size={14} strokeWidth={3} />
              <span>已簽到 {formatCheckInTime(lesson.checkInTime)}</span>
            </div>
          ) : isMissed ? (
            <div className="flex items-center gap-1 text-red-600 font-black text-[10px] uppercase tracking-tighter bg-red-50 px-2 py-1 rounded-md">
              <AlertCircle size={14} strokeWidth={3} />
              <span>缺簽，請洽管理員</span>
            </div>
          ) : isUnknown ? (
            <div className="flex items-center gap-1 text-slate-500 font-bold text-[10px] uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded-md">
              <AlertCircle size={14} />
              <span>狀態未知</span>
            </div>
          ) : isBeforeCheckIn ? (
            <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-tighter">
              <Clock size={14} />
              <span>尚未到簽到時間</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase tracking-tighter bg-green-50 px-2 py-1 rounded-md">
              <Clock size={14} />
              <span>可簽到</span>
            </div>
          )}
        </div>

        {isOwner && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleCheckIn();
            }}
            disabled={!canCheckIn}
            className={cn(
              'h-8 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all',
              lesson.checkedIn
                ? 'bg-slate-200 text-slate-400'
                : isMissed || isUnknown
                  ? 'bg-red-50 text-red-600 border border-red-100 cursor-not-allowed'
                  : canCheckIn
                    ? 'bg-[#d5f4d8] text-slate-800 shadow-md shadow-primary/20 hover:scale-105 active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed',
            )}
          >
            {lesson.checkedIn ? '已簽到' : isUnknown ? '狀態未知' : isMissed ? '缺簽' : canCheckIn ? '點擊簽到' : '尚未開放'}
          </button>
        )}
      </div>
    </div>
  );
};
