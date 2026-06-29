import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { AlertCircle, CalendarClock, CheckCircle2, Save, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { db } from '../lib/firebase';
import { AvailabilityDay } from '../types';

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const DEFAULT_AVAILABILITY: AvailabilityDay[] = [
  { day: 1, label: '星期一', isAvailable: false, startTime: '09:00', endTime: '20:00' },
  { day: 2, label: '星期二', isAvailable: false, startTime: '09:00', endTime: '20:00' },
  { day: 3, label: '星期三', isAvailable: false, startTime: '09:00', endTime: '20:00' },
  { day: 4, label: '星期四', isAvailable: false, startTime: '09:00', endTime: '20:00' },
  { day: 5, label: '星期五', isAvailable: false, startTime: '09:00', endTime: '20:00' },
  { day: 6, label: '星期六', isAvailable: false, startTime: '09:00', endTime: '20:00' },
  { day: 0, label: '星期日', isAvailable: false, startTime: '09:00', endTime: '20:00' },
];

function createDefaultAvailability() {
  return DEFAULT_AVAILABILITY.map((day) => ({ ...day }));
}

function normalizeAvailability(value: unknown): AvailabilityDay[] {
  if (!Array.isArray(value)) return createDefaultAvailability();

  const savedDays = new Map<number, Partial<AvailabilityDay>>(
    value
      .filter((item): item is Partial<AvailabilityDay> => Boolean(item) && typeof item === 'object')
      .filter((item) => typeof item.day === 'number')
      .map((item) => [item.day as number, item]),
  );

  return DEFAULT_AVAILABILITY.map((defaultDay) => {
    const savedDay = savedDays.get(defaultDay.day);
    return {
      ...defaultDay,
      isAvailable: Boolean(savedDay?.isAvailable),
      startTime: typeof savedDay?.startTime === 'string' ? savedDay.startTime : defaultDay.startTime,
      endTime: typeof savedDay?.endTime === 'string' ? savedDay.endTime : defaultDay.endTime,
    };
  });
}

export function AvailabilityModal({ isOpen, onClose, userId }: AvailabilityModalProps) {
  const [availability, setAvailability] = useState<AvailabilityDay[]>(createDefaultAvailability);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isActive = true;
    setIsLoading(true);
    setError(null);
    setAvailability(createDefaultAvailability());

    getDoc(doc(db, 'users', userId))
      .then((userSnapshot) => {
        if (isActive) {
          setAvailability(normalizeAvailability(userSnapshot.data()?.availability));
        }
      })
      .catch((loadError) => {
        console.error('Failed to load availability:', loadError);
        if (isActive) setError('讀取可排課時間失敗，請稍後再試。');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isOpen, userId]);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateAvailabilityDay = (day: number, updates: Partial<AvailabilityDay>) => {
    setAvailability((currentAvailability) =>
      currentAvailability.map((item) => (item.day === day ? { ...item, ...updates } : item)),
    );
  };

  const handleSave = async () => {
    const invalidDay = availability.find(
      (item) => item.isAvailable && (!item.startTime || !item.endTime || item.startTime >= item.endTime),
    );

    if (invalidDay) {
      setError(`請確認${invalidDay.label}的開始與結束時間。`);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await updateDoc(doc(db, 'users', userId), { availability });
      setToast('時間設定已更新');
      onClose();
    } catch (saveError) {
      console.error('Failed to save availability:', saveError);
      setError('儲存可排課時間失敗，請稍後再試。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <motion.button
              type="button"
              aria-label="關閉可排課時間設定"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-[#2a0726]/70"
            />

            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="availability-title"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-lg bg-white shadow-2xl sm:max-w-lg sm:rounded-lg"
            >
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d5f4d8] text-[#2a0726]">
                    <CalendarClock size={21} />
                  </div>
                  <div>
                    <h2 id="availability-title" className="text-base font-black text-[#2a0726]">可排課時間設定</h2>
                    <p className="text-xs font-bold text-slate-400">設定每週可接課的時間區段</p>
                  </div>
                </div>
                <button type="button" aria-label="關閉" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                  <X size={20} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {isLoading ? (
                  <div className="py-16 text-center text-sm font-bold text-slate-400">正在讀取時間設定...</div>
                ) : (
                  <div className="divide-y divide-slate-200 border-y border-slate-200">
                    {availability.map((item) => (
                      <div key={item.day} className="py-3">
                        <div className="flex min-h-10 items-center justify-between gap-3">
                          <label className="flex cursor-pointer items-center gap-3 text-sm font-black text-slate-700">
                            <input
                              type="checkbox"
                              checked={item.isAvailable}
                              onChange={(event) => updateAvailabilityDay(item.day, { isAvailable: event.target.checked })}
                              className="h-5 w-5 rounded border-slate-300 accent-[#2a0726]"
                            />
                            {item.label}
                          </label>
                          <span className={`text-[10px] font-black ${item.isAvailable ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {item.isAvailable ? '可排課' : '不開放'}
                          </span>
                        </div>

                        {item.isAvailable && (
                          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 pl-8">
                            <input
                              type="time"
                              value={item.startTime}
                              onChange={(event) => updateAvailabilityDay(item.day, { startTime: event.target.value })}
                              aria-label={`${item.label}開始時間`}
                              step={1800}
                              className="h-10 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none focus:border-[#2a0726]"
                            />
                            <span className="text-xs font-bold text-slate-400">至</span>
                            <input
                              type="time"
                              value={item.endTime}
                              onChange={(event) => updateAvailabilityDay(item.day, { endTime: event.target.value })}
                              aria-label={`${item.label}結束時間`}
                              step={1800}
                              className="h-10 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none focus:border-[#2a0726]"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <footer className="border-t border-slate-200 bg-white p-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading || isSaving}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#d5f4d8] text-sm font-black text-[#2a0726] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={18} />
                  {isSaving ? '儲存中...' : '儲存時間設定'}
                </button>
              </footer>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-md bg-[#2a0726] px-4 py-3 text-sm font-bold text-white shadow-xl"
          >
            <CheckCircle2 size={17} className="text-[#d5f4d8]" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
