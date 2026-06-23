import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';

interface OnboardingModalProps {
  userId?: string;
  isAuthenticated: boolean;
}

const STORAGE_KEY_PREFIX = 'swimSchedule:onboardingManualHidden';

export function OnboardingModal({ userId, isAuthenticated }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const storageKey = userId
    ? `${STORAGE_KEY_PREFIX}:${userId}`
    : STORAGE_KEY_PREFIX;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setIsOpen(false);
      return;
    }

    const hasHiddenManual = localStorage.getItem(storageKey) === 'true';
    setIsOpen(!hasHiddenManual);
  }, [isAuthenticated, storageKey, userId]);

  const handleStart = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#2a0726]/80 px-4 py-6 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-11/12 max-w-md max-h-[86vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d5f4d8] text-[#2a0726]">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Welcome Guide
            </p>
            <h2 id="onboarding-title" className="text-lg font-black text-[#2a0726]">
              游泳排程使用手冊
            </h2>
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-5 py-4">
          <div className="prose prose-sm max-w-none text-slate-700">
            <p className="font-medium text-slate-600">
              歡迎使用 SWIMSchedule。以下重點能協助教練快速完成排課、管理場地與確認課程狀態。
            </p>

            <ol className="space-y-3 pl-5">
              <li>
                <strong className="text-[#2a0726]">選擇泳池類型：</strong>
                新增課程時可選擇 25m 池或小泳池。25m 池會進一步指定泳道，方便系統檢查同時段容量。
              </li>
              <li>
                <strong className="text-[#2a0726]">設定團班人數：</strong>
                一對一、一對二、一對三會自動帶入學生人數；選擇 Group 團班後可手動覆寫人數。
              </li>
              <li>
                <strong className="text-[#2a0726]">確認課程時間：</strong>
                系統會依開始時間自動帶入預設一小時課程，教練仍可依實際需求調整結束時間。
              </li>
              <li>
                <strong className="text-[#2a0726]">課前課後簽到：</strong>
                建議在上課前後 15 分鐘內完成簽到，讓管理員能掌握當日課程與場地使用狀況。
              </li>
              <li>
                <strong className="text-[#2a0726]">查看統計與報表：</strong>
                使用底部導覽列切換排程、場地監控、報表與個人資料，快速完成日常管理。
              </li>
            </ol>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <label className="mb-4 flex items-center gap-3 text-sm font-bold text-[#2a0726]">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 accent-[#2a0726]"
            />
            不再顯示此手冊
          </label>

          <button
            type="button"
            onClick={handleStart}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#d5f4d8] text-base font-black text-[#2a0726] shadow-lg shadow-[#d5f4d8]/50 active:scale-[0.98] transition-transform"
          >
            <CheckCircle2 size={20} />
            我已了解 / 開始排課
          </button>
        </div>
      </div>
    </div>
  );
}
