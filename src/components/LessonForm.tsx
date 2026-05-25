import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { addWeeks, format, isAfter, parse, parseISO, getDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Lesson, PoolType, LessonType } from '../types';
import { TIME_SLOTS, checkCollision } from '../lib/scheduling';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { lessonsService } from '../services/lessonsService';

interface LessonFormProps {
  isOpen: boolean;
  onClose: () => void;
  existingLessons: Lesson[];
  editLesson?: Lesson;
}

export function LessonForm({ isOpen, onClose, existingLessons, editLesson }: LessonFormProps) {
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState(format(addWeeks(new Date(), 4), 'yyyy-MM-dd'));
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<Partial<Lesson>>({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      poolType: '25m',
      lessonType: '1:1',
      studentCount: 1,
      lane: 1,
    }
  });

  const poolType = watch('poolType');
  const lessonType = watch('lessonType');
  const startTime = watch('startTime');
  const endTime = watch('endTime');

  useEffect(() => {
    if (startTime && !editLesson) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHour = hours + 1;
      const endSlot = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      if (TIME_SLOTS.includes(endSlot)) {
        setValue('endTime', endSlot);
      }
    }
  }, [startTime, setValue, editLesson]);

  useEffect(() => {
    if (editLesson) {
      reset(editLesson);
      setIsRecurring(false);
    } else {
      reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:00',
        poolType: '25m',
        lessonType: '1:1',
        studentCount: 1,
        lane: 1,
      });
      setIsRecurring(false);
    }
  }, [editLesson, reset, isOpen]);

  // Auto-set student count based on lesson type
  useEffect(() => {
    if (lessonType === '1:1') setValue('studentCount', 1);
    else if (lessonType === '1:2') setValue('studentCount', 2);
    else if (lessonType === '1:3') setValue('studentCount', 3);
  }, [lessonType, setValue]);

  const handleDelete = async () => {
    if (!editLesson) return;
    const confirmDelete = window.confirm('確定要刪除此排課嗎？此動作無法復原。');
    if (!confirmDelete) return;

    try {
      await lessonsService.deleteLesson(editLesson.id);
      onClose();
    } catch (err: any) {
      console.error('Delete failed:', err);
      try {
        const errInfo = JSON.parse(err.message);
        if (errInfo.error.includes('insufficient permissions')) {
          alert('刪除失敗：您沒有權限刪除此課程（可能課程已核准，或您非此課程教練）。');
        } else {
          alert('刪除失敗：' + errInfo.error);
        }
      } catch {
        alert('刪除失敗，請稍後再試。');
      }
    }
  };

  const onSubmit = async (data: Partial<Lesson>) => {
    try {
      setError(null);
      if (!profile) return;

      if (!data.date) {
        setError('請選擇日期');
        return;
      }

      const lessonsToCreate: any[] = [];
      
      if (!editLesson && isRecurring) {
        if (!repeatUntil) {
          setError('請選擇重複結束日期');
          return;
        }
        
        let currentDate = parseISO(data.date);
        const endDate = parseISO(repeatUntil);
        
        if (isNaN(currentDate.getTime()) || isNaN(endDate.getTime())) {
          setError('日期格式不正確');
          return;
        }

        while (!isAfter(currentDate, endDate)) {
          lessonsToCreate.push({
            ...data,
            date: format(currentDate, 'yyyy-MM-dd'),
            coachId: profile.uid,
            coachName: profile.displayName || profile.email,
            status: 'Approved',
            checkedIn: false
          });
          currentDate = addWeeks(currentDate, 1);
        }
      } else {
        const lessonData: any = {
          ...data,
        };

        if (editLesson) {
          lessonData.id = editLesson.id;
          if (profile.role !== 'Admin') {
            const hasChanges = Object.keys(data).some(key => {
              // Ignore checkIn details when determining if core details changed
              if (['checkedIn', 'checkInTime'].includes(key)) return false;
              return data[key as keyof Lesson] !== editLesson[key as keyof Lesson];
            });
            if (hasChanges) {
              lessonData.status = 'Pending';
            } else {
              lessonData.status = editLesson.status;
            }
          }
        } else {
          lessonData.coachId = profile.uid;
          lessonData.coachName = profile.displayName || profile.email;
          lessonData.status = 'Approved';
          lessonData.checkedIn = false;
        }
        
        lessonsToCreate.push(lessonData);
      }

      // Check collisions for all lessons
      for (const l of lessonsToCreate) {
        const collision = checkCollision(l, existingLessons);
        if (collision.conflict) {
          setError(`偵測到衝突於 ${l.date} ${l.startTime}: ${collision.message || '時段衝突'}`);
          return;
        }
      }

      if (editLesson) {
        const lessonData = lessonsToCreate[0];
        if (lessonData.checkedIn && !editLesson.checkedIn && !lessonData.checkInTime) {
          lessonData.checkInTime = new Date();
        } else if (!lessonData.checkedIn && editLesson.checkedIn) {
          lessonData.checkInTime = null;
        }
        await lessonsService.updateLesson(editLesson.id, lessonData);
      } else {
        await Promise.all(lessonsToCreate.map(l => lessonsService.createLesson(l)));
        
        try {
          const summaryLesson = lessonsToCreate[0];
          await fetch('/api/notify-lesson', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              lessonDetails: {
                date: lessonsToCreate.length > 1 ? `${summaryLesson.date} 等 ${lessonsToCreate.length} 堂課` : summaryLesson.date,
                startTime: summaryLesson.startTime,
                endTime: summaryLesson.endTime,
                poolType: summaryLesson.poolType,
                lessonType: summaryLesson.lessonType,
                coachName: summaryLesson.coachName
              }
            })
          });
        } catch (emailErr) {
          console.error('Email notification failed:', emailErr);
        }
      }
      onClose();
    } catch (err: any) {
      console.error('Save error:', err);
      try {
        const errInfo = JSON.parse(err.message);
        setError(`儲存失敗: ${errInfo.error || '權限不足或系統錯誤'}`);
      } catch {
        setError(`儲存失敗: ${err?.message || '不明錯誤'}`);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
                {editLesson ? '修改排程' : '新增排程'}
              </h2>
              <button onClick={onClose} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-4 overflow-y-auto space-y-4 pb-20">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 flex items-start gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">日期</label>
                  <input
                    type="date"
                    {...register('date')}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-bold"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="space-y-1 flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">開始時間</label>
                    <select
                      {...register('startTime')}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">結束時間</label>
                    <select
                      {...register('endTime')}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {!editLesson && (
                <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700">每週固定時段</span>
                      <span className="text-[10px] text-slate-400 font-bold">每週 {format(parseISO(watch('date') || format(new Date(), 'yyyy-MM-dd')), 'eeee', { locale: zhTW })} 重複</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        isRecurring ? "bg-primary" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        isRecurring ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  {isRecurring && (
                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">重複直到</label>
                      <input
                        type="date"
                        value={repeatUntil}
                        onChange={(e) => setRepeatUntil(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-primary outline-none transition-all text-sm font-bold"
                        min={watch('date')}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">選擇泳池</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['25m', 'Small'] as PoolType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue('poolType', type)}
                      className={cn(
                        "h-11 rounded-xl border-2 transition-all flex items-center justify-center text-xs font-black uppercase tracking-widest shadow-sm",
                        poolType === type ? "border-primary bg-primary/20 text-slate-800" : "border-slate-100 bg-slate-50 text-slate-300"
                      )}
                    >
                      {type === '25m' ? '25m 大池' : '教學小池'}
                    </button>
                  ))}
                </div>
              </div>

              {poolType === '25m' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">分配水道</label>
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setValue('lane', l)}
                        className={cn(
                          "h-10 rounded-lg border-2 transition-all flex items-center justify-center text-xs font-black",
                          watch('lane') === l ? "bg-slate-800 text-white border-slate-800 shadow-lg" : "bg-white text-slate-300 border-slate-100"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">上課類別</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['1:1', '1:2', '1:3', 'Group'] as LessonType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue('lessonType', type)}
                      className={cn(
                        "h-9 rounded-lg border transition-all flex items-center justify-center text-[10px] font-black uppercase",
                        lessonType === type ? "bg-blue-500 text-white border-blue-500 shadow-md" : "bg-slate-50 text-slate-400 border-slate-100"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">學生人數</label>
                <input
                  type="number"
                  {...register('studentCount', { valueAsNumber: true })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 outline-none transition-all text-sm font-bold"
                  readOnly={lessonType !== 'Group'}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">學生姓名/資訊</label>
                <input
                  type="text"
                  {...register('studentNames')}
                  placeholder="請輸入學生姓名..."
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
                />
              </div>

              {profile?.role === 'Admin' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">審核狀態</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['Pending', 'Approved'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setValue('status', status)}
                          className={cn(
                            "h-11 rounded-xl border-2 transition-all flex items-center justify-center text-xs font-black uppercase tracking-widest shadow-sm",
                            watch('status') === status 
                              ? (status === 'Approved' ? "border-green-500 bg-green-50 text-green-700" : "border-yellow-500 bg-yellow-50 text-yellow-700")
                              : "border-slate-100 bg-slate-50 text-slate-300"
                          )}
                        >
                          {status === 'Approved' ? '已核准' : '待審核'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">簽到狀態</label>
                    <button
                      type="button"
                      onClick={() => setValue('checkedIn', !watch('checkedIn'))}
                      className={cn(
                        "w-full h-11 rounded-xl border-2 transition-all flex items-center justify-center text-xs font-black uppercase tracking-widest shadow-sm",
                        watch('checkedIn') ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-slate-50 text-slate-300"
                      )}
                    >
                      {watch('checkedIn') ? '已簽到' : '未簽到'}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">管理員備註</label>
                    <textarea
                      {...register('adminNote')}
                      placeholder="輸入給教練的備註..."
                      className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold min-h-[100px]"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-4">
                {editLesson && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-[0.5] h-14 bg-red-50 text-red-500 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all outline-none border border-red-100"
                  >
                    <Trash2 size={18} />
                    刪除
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 h-14 bg-primary text-slate-800 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Save size={18} />
                  確認存檔
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
