import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarClock, Plus, Save, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createAvailabilitySlot, createDefaultAvailability, normalizeAvailability } from '../lib/availability';
import { AvailabilityDay, AvailabilityTimeSlot } from '../types';

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAvailability: AvailabilityDay[];
  onSave: (availability: AvailabilityDay[]) => Promise<void>;
}

export function validateAvailability(availability: AvailabilityDay[]) {
  for (const day of availability) {
    if (!day.isAvailable) continue;
    if (day.slots.length === 0) return `請為${day.label}新增至少一個時段。`;

    const sortedSlots = [...day.slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let index = 0; index < sortedSlots.length; index += 1) {
      const slot = sortedSlots[index];
      if (!slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) {
        return `請確認${day.label}第 ${index + 1} 段的開始與結束時間。`;
      }

      const previousSlot = sortedSlots[index - 1];
      if (previousSlot && slot.startTime < previousSlot.endTime) {
        return `${day.label}的可排課時段不可重疊。`;
      }
    }
  }

  return null;
}

export function AvailabilityModal({ isOpen, onClose, initialAvailability, onSave }: AvailabilityModalProps) {
  const [availability, setAvailability] = useState<AvailabilityDay[]>(createDefaultAvailability);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setError(null);
      setAvailability(normalizeAvailability(initialAvailability));
    }
    wasOpen.current = isOpen;
  }, [initialAvailability, isOpen]);

  const updateAvailabilitySlot = (day: number, slotId: string, updates: Partial<AvailabilityTimeSlot>) => {
    setAvailability((currentAvailability) =>
      currentAvailability.map((item) =>
        item.day === day
          ? {
              ...item,
              slots: item.slots.map((slot) => (slot.id === slotId ? { ...slot, ...updates } : slot)),
            }
          : item,
      ),
    );
  };

  const toggleAvailabilityDay = (day: number, isAvailable: boolean) => {
    setAvailability((currentAvailability) =>
      currentAvailability.map((item) =>
        item.day === day
          ? {
              ...item,
              isAvailable,
              slots: isAvailable && item.slots.length === 0 ? [createAvailabilitySlot()] : item.slots,
            }
          : item,
      ),
    );
  };

  const addAvailabilitySlot = (day: number) => {
    setAvailability((currentAvailability) =>
      currentAvailability.map((item) =>
        item.day === day ? { ...item, slots: [...item.slots, createAvailabilitySlot()] } : item,
      ),
    );
  };

  const removeAvailabilitySlot = (day: number, slotId: string) => {
    setAvailability((currentAvailability) =>
      currentAvailability.map((item) =>
        item.day === day ? { ...item, slots: item.slots.filter((slot) => slot.id !== slotId) } : item,
      ),
    );
  };

  const handleSave = async () => {
    const validationError = validateAvailability(availability);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(availability);
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

                <div className="divide-y divide-slate-200 border-y border-slate-200">
                  {availability.map((item) => (
                    <div key={item.day} className="py-3">
                        <div className="flex min-h-10 items-center justify-between gap-3">
                          <label className="flex cursor-pointer items-center gap-3 text-sm font-black text-slate-700">
                            <input
                              type="checkbox"
                              checked={item.isAvailable}
                              onChange={(event) => toggleAvailabilityDay(item.day, event.target.checked)}
                              className="h-5 w-5 rounded border-slate-300 accent-[#2a0726]"
                            />
                            {item.label}
                          </label>
                          <span className={`text-[10px] font-black ${item.isAvailable ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {item.isAvailable ? '可排課' : '不開放'}
                          </span>
                        </div>

                        {item.isAvailable && (
                          <div className="mt-2 space-y-2 pl-8">
                            {item.slots.map((slot, slotIndex) => (
                              <div key={slot.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(event) => updateAvailabilitySlot(item.day, slot.id, { startTime: event.target.value })}
                                  aria-label={`${item.label}第 ${slotIndex + 1} 段開始時間`}
                                  step={1800}
                                  className="h-10 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none focus:border-[#2a0726]"
                                />
                                <span className="text-xs font-bold text-slate-400">至</span>
                                <input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(event) => updateAvailabilitySlot(item.day, slot.id, { endTime: event.target.value })}
                                  aria-label={`${item.label}第 ${slotIndex + 1} 段結束時間`}
                                  step={1800}
                                  className="h-10 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-bold outline-none focus:border-[#2a0726]"
                                />
                                <button
                                  type="button"
                                  aria-label={`刪除${item.label}第 ${slotIndex + 1} 段`}
                                  onClick={() => removeAvailabilitySlot(item.day, slot.id)}
                                  className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => addAvailabilitySlot(item.day)}
                              className="flex h-9 items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 text-xs font-black text-slate-600 hover:border-[#2a0726] hover:text-[#2a0726]"
                            >
                              <Plus size={15} />
                              新增時段
                            </button>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              <footer className="border-t border-slate-200 bg-white p-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
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
    </>
  );
}
