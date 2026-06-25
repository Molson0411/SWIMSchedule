import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { addWeeks, format, isAfter, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Lesson, LessonType, PoolType } from '../types';
import { TIME_SLOTS, checkCollision } from '../lib/scheduling';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { lessonsService } from '../services/lessonsService';
import { notificationService } from '../services/notificationService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LessonFormProps {
  isOpen: boolean;
  onClose: () => void;
  existingLessons: Lesson[];
  editLesson?: Lesson;
}

const createDefaultLessonValues = (): Partial<Lesson> => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  endTime: '10:00',
  poolType: '25m',
  lessonType: '1:1',
  studentCount: 1,
  studentNames: '',
  adminNote: '',
  lane: 1,
});

type CapacityStatus = 'safe' | 'warning' | 'full';

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasTimeOverlap(startTime: string, endTime: string, existingStartTime: string, existingEndTime: string) {
  return timeToMinutes(startTime) < timeToMinutes(existingEndTime) && timeToMinutes(endTime) > timeToMinutes(existingStartTime);
}

function useCapacityCheck({
  date,
  startTime,
  endTime,
  poolType,
  lane,
  excludeLessonId,
}: {
  date?: string;
  startTime?: string;
  endTime?: string;
  poolType?: PoolType;
  lane?: number;
  excludeLessonId?: string;
}) {
  const [capacity, setCapacity] = useState({
    current: 0,
    max: poolType === 'Small' ? 30 : 8,
    status: 'safe' as CapacityStatus,
    loading: false,
  });

  useEffect(() => {
    const max = poolType === 'Small' ? 30 : 8;

    if (!date || !startTime || !endTime || !poolType || (poolType === '25m' && !lane)) {
      setCapacity({ current: 0, max, status: 'safe', loading: false });
      return;
    }

    let isActive = true;

    async function fetchCapacity() {
      setCapacity((currentCapacity) => ({ ...currentCapacity, max, loading: true }));

      const lessonsQuery = query(collection(db, 'lessons'), where('date', '==', date));
      const snapshot = await getDocs(lessonsQuery);
      const lessons = snapshot.docs.map((lessonDoc) => ({
        id: lessonDoc.id,
        ...lessonDoc.data(),
      })) as Lesson[];

      const current = lessons
        .filter((lesson) => lesson.id !== excludeLessonId)
        .filter((lesson) => hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime))
        .filter((lesson) => {
          if (poolType === '25m') {
            return lesson.poolType === '25m' && lesson.lane === lane;
          }

          return lesson.poolType === 'Small';
        })
        .reduce((total, lesson) => total + Number(lesson.studentCount || 0) + 1, 0);

      const usage = current / max;
      const status: CapacityStatus = usage >= 1 ? 'full' : usage >= 0.8 ? 'warning' : 'safe';

      if (isActive) {
        setCapacity({ current, max, status, loading: false });
      }
    }

    fetchCapacity().catch((error) => {
      console.error('Capacity check failed:', error);
      if (isActive) {
        setCapacity({ current: 0, max, status: 'safe', loading: false });
      }
    });

    return () => {
      isActive = false;
    };
  }, [date, endTime, excludeLessonId, lane, poolType, startTime]);

  return capacity;
}

export function LessonForm({ isOpen, onClose, existingLessons, editLesson }: LessonFormProps) {
  const { user, profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState(format(addWeeks(new Date(), 4), 'yyyy-MM-dd'));

  const { register, handleSubmit, watch, setValue, reset } = useForm<Partial<Lesson>>({
    defaultValues: createDefaultLessonValues(),
  });

  const poolType = watch('poolType');
  const lessonType = watch('lessonType');
  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const selectedLane = watch('lane');
  const selectedDate = watch('date') || format(new Date(), 'yyyy-MM-dd');
  const capacity = useCapacityCheck({
    date: selectedDate,
    startTime,
    endTime,
    poolType,
    lane: selectedLane,
    excludeLessonId: editLesson?.id,
  });
  const isCapacityFull = capacity.status === 'full';

  const resetFormState = () => {
    reset(createDefaultLessonValues());
    setIsRecurring(false);
    setRepeatUntil(format(addWeeks(new Date(), 4), 'yyyy-MM-dd'));
  };

  useEffect(() => {
    if (editLesson) {
      reset(editLesson);
    } else {
      resetFormState();
    }
    setError(null);
  }, [editLesson, isOpen, reset]);

  useEffect(() => {
    if (!startTime || editLesson) return;

    const [hours, minutes] = startTime.split(':').map(Number);
    const nextEndTime = `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    if (TIME_SLOTS.includes(nextEndTime)) {
      setValue('endTime', nextEndTime);
    }
  }, [editLesson, setValue, startTime]);

  useEffect(() => {
    if (lessonType === '1:1') setValue('studentCount', 1);
    if (lessonType === '1:2') setValue('studentCount', 2);
    if (lessonType === '1:3') setValue('studentCount', 3);
  }, [lessonType, setValue]);

  const handleDelete = async () => {
    if (!editLesson) return;
    if (!window.confirm('確定要刪除這堂課嗎？此動作無法復原。')) return;

    if (editLesson.coachId !== user?.uid) {
      window.alert('權限不足：您只能更改自己的排課資料！');
      return;
    }

    try {
      setError(null);
      await lessonsService.deleteLesson(editLesson.id);
      resetFormState();
      onClose();
      window.alert('課程已刪除');
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err instanceof Error ? err.message : '刪除失敗，請稍後再試。');
    }
  };

  const buildLessons = (data: Partial<Lesson>) => {
    if (!profile) return [];

    const baseLesson = {
      ...data,
      studentNames: data.studentNames ?? '',
      adminNote: data.adminNote ?? '',
      coachId: editLesson?.coachId || user?.uid || profile.uid,
      coachName: editLesson?.coachName || profile.displayName || profile.email,
      status: editLesson ? data.status || editLesson.status : 'Approved',
      checkedIn: editLesson ? Boolean(data.checkedIn) : false,
    };

    if (editLesson) {
      return [{ ...baseLesson, id: editLesson.id }];
    }

    if (!isRecurring) {
      return [baseLesson];
    }

    const lessons: Partial<Lesson>[] = [];
    let currentDate = parseISO(data.date || '');
    const endDate = parseISO(repeatUntil);

    if (isNaN(currentDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('日期格式不正確。');
    }

    while (!isAfter(currentDate, endDate)) {
      lessons.push({
        ...baseLesson,
        date: format(currentDate, 'yyyy-MM-dd'),
      });
      currentDate = addWeeks(currentDate, 1);
    }

    return lessons;
  };

  const onSubmit = async (data: Partial<Lesson>) => {
    try {
      setError(null);

      if (editLesson && editLesson.coachId !== user?.uid) {
        window.alert('權限不足：您只能更改自己的排課資料！');
        return;
      }

      if (!user) {
        setError('請先登入後再新增或更新課程。');
        return;
      }

      if (!profile) {
        setError('已取得登入狀態，正在載入使用者資料，請稍後再試。');
        return;
      }

      if (!data.date) {
        setError('請選擇課程日期。');
        return;
      }

      if (!data.startTime || !data.endTime || data.startTime >= data.endTime) {
        setError('請確認課程開始與結束時間。');
        return;
      }

      if (!editLesson && isRecurring && !repeatUntil) {
        setError('請選擇重複課程的結束日期。');
        return;
      }

      if (isCapacityFull) {
        const message = '該時段已額滿，請選擇其他時間或水道。';
        setError(message);
        window.alert(message);
        return;
      }

      const lessonsToSave = buildLessons(data);

      for (const lesson of lessonsToSave) {
        const collision = checkCollision(lesson, existingLessons);
        if (collision.conflict) {
          setError(`課程衝突：${lesson.date} ${lesson.startTime}，${collision.message || '時段已被使用。'}`);
          return;
        }
      }

      for (const lesson of lessonsToSave) {
        if (!lesson.coachId || !lesson.date || !lesson.startTime || !lesson.endTime) {
          setError('課程資料尚未完整，請確認教練、日期與時間。');
          return;
        }

        // 將即將送出的課程與 Firestore 中同教練、同日期的既有課程比對。
        // 時間重疊公式：(新開始 < 既有結束) && (新結束 > 既有開始)。
        const hasCoachConflict = await lessonsService.checkTimeConflict({
          coachId: lesson.coachId,
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          excludeLessonId: editLesson?.id,
        });

        if (hasCoachConflict) {
          const message = '您在這個時段已經有排課了，請選擇其他時間！';
          setError(message);
          window.alert(message);
          return;
        }
      }

      if (editLesson) {
        await lessonsService.updateLesson(editLesson.id, lessonsToSave[0]);
      } else {
        await Promise.all(
          lessonsToSave.map((lesson) =>
            lessonsService.createLesson(lesson as Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>),
          ),
        );

        const summaryLesson = lessonsToSave[0];
        try {
          await notificationService.notifyLessonCreated({
            email: profile.email,
            lessonDetails: {
              date: lessonsToSave.length > 1 ? `${summaryLesson.date} 起，共 ${lessonsToSave.length} 堂` : summaryLesson.date || '',
              startTime: summaryLesson.startTime || '',
              endTime: summaryLesson.endTime || '',
              poolType: summaryLesson.poolType || '',
              lessonType: summaryLesson.lessonType || '',
              coachName: summaryLesson.coachName || '',
            },
          });
        } catch (notificationError) {
          console.warn('Lesson saved, but notification failed:', notificationError);
        }
      }

      setError(null);
      resetFormState();
      onClose();
      window.alert(editLesson ? '課程更新成功' : '課程新增成功');
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : '儲存失敗，請稍後再試。');
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
                {editLesson ? '編輯課程' : '新增課程'}
              </h2>
              <button type="button" onClick={onClose} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-4 overflow-y-auto space-y-4 pb-20">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 flex items-start gap-2 text-xs font-bold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="日期">
                  <input type="date" {...register('date')} className={inputClassName} />
                </Field>

                <div className="flex gap-2">
                  <Field label="開始">
                    <select {...register('startTime')} className={inputClassName}>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="結束">
                    <select {...register('endTime')} className={inputClassName}>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {!editLesson && (
                <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700">每週重複課程</span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        每週 {format(parseISO(selectedDate), 'eeee', { locale: zhTW })} 建立一堂
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={cn('w-12 h-6 rounded-full transition-all relative', isRecurring ? 'bg-primary' : 'bg-slate-300')}
                    >
                      <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', isRecurring ? 'left-7' : 'left-1')} />
                    </button>
                  </div>

                  {isRecurring && (
                    <Field label="重複到">
                      <input
                        type="date"
                        value={repeatUntil}
                        onChange={(event) => setRepeatUntil(event.target.value)}
                        min={selectedDate}
                        className={inputClassName}
                      />
                    </Field>
                  )}
                </div>
              )}

              <Field label="泳池">
                <div className="grid grid-cols-2 gap-3">
                  {(['25m', 'Small'] as PoolType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue('poolType', type)}
                      className={cn(
                        'h-11 rounded-xl border-2 transition-all flex items-center justify-center text-xs font-black uppercase tracking-widest shadow-sm',
                        poolType === type ? 'border-primary bg-primary/20 text-slate-800' : 'border-slate-100 bg-slate-50 text-slate-300',
                      )}
                    >
                      {type === '25m' ? '25m 大池' : '小池'}
                    </button>
                  ))}
                </div>
              </Field>

              {poolType === '25m' && (
                <Field label="泳道">
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((lane) => (
                      <button
                        key={lane}
                        type="button"
                        onClick={() => setValue('lane', lane)}
                        className={cn(
                          'h-10 rounded-lg border-2 transition-all flex items-center justify-center text-xs font-black',
                          watch('lane') === lane ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-300 border-slate-100',
                        )}
                      >
                        {lane}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <CapacityAlertBox capacity={capacity} />

              <Field label="課程類型">
                <div className="grid grid-cols-4 gap-2">
                  {(['1:1', '1:2', '1:3', 'Group'] as LessonType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue('lessonType', type)}
                      className={cn(
                        'h-9 rounded-lg border transition-all flex items-center justify-center text-[10px] font-black uppercase',
                        lessonType === type ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100',
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="學生人數">
                <input type="number" min={0} {...register('studentCount', { valueAsNumber: true })} className={inputClassName} readOnly={lessonType !== 'Group'} />
              </Field>

              <Field label="學生姓名 / 備註">
                <input type="text" {...register('studentNames')} placeholder="輸入學生姓名或備註" className={inputClassName} />
              </Field>

              {profile && (
                <>
                  <Field label="審核狀態">
                    <div className="grid grid-cols-2 gap-3">
                      {(['Pending', 'Approved'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setValue('status', status)}
                          className={cn(
                            'h-11 rounded-xl border-2 transition-all flex items-center justify-center text-xs font-black uppercase tracking-widest shadow-sm',
                            watch('status') === status
                              ? status === 'Approved'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-yellow-500 bg-yellow-50 text-yellow-700'
                              : 'border-slate-100 bg-slate-50 text-slate-300',
                          )}
                        >
                          {status === 'Approved' ? '已核准' : '待審核'}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="簽到狀態">
                    <button
                      type="button"
                      onClick={() => setValue('checkedIn', !watch('checkedIn'))}
                      className={cn(
                        'w-full h-11 rounded-xl border-2 transition-all flex items-center justify-center text-xs font-black uppercase tracking-widest shadow-sm',
                        watch('checkedIn') ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-300',
                      )}
                    >
                      {watch('checkedIn') ? '已簽到' : '未簽到'}
                    </button>
                  </Field>

                  <Field label="管理員備註">
                    <textarea {...register('adminNote')} placeholder="輸入管理備註" className={`${inputClassName} min-h-[100px] py-3`} />
                  </Field>
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
                  disabled={isCapacityFull}
                  className={cn(
                    'flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all',
                    isCapacityFull
                      ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed active:scale-100'
                      : 'bg-primary text-slate-800 shadow-primary/20',
                  )}
                >
                  <Save size={18} />
                  儲存
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const inputClassName = 'w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-bold';

function CapacityAlertBox({
  capacity,
}: {
  capacity: {
    current: number;
    max: number;
    status: CapacityStatus;
    loading: boolean;
  };
}) {
  const message =
    capacity.status === 'full'
      ? `🚫 該時段已額滿 (${capacity.current} / ${capacity.max} 人)，請選擇其他時間或水道`
      : capacity.status === 'warning'
        ? `⚠️ 該時段即將額滿：${capacity.current} / ${capacity.max} 人`
        : `🏊 該時段目前人數：${capacity.current} / ${capacity.max} 人`;

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-xs font-black leading-6 transition-all',
        capacity.status === 'full'
          ? 'border-red-200 bg-red-50 text-red-700'
          : capacity.status === 'warning'
            ? 'border-orange-200 bg-orange-50 text-orange-700'
            : 'border-green-100 bg-green-50 text-green-700',
      )}
    >
      {capacity.loading ? '正在更新泳池人數...' : message}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 flex-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}
