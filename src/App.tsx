import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BottomNavigation } from './components/BottomNavigation';
import { LessonForm } from './components/LessonForm';
import { LessonCard } from './components/LessonCard';
import { PoolMonitor } from './components/PoolMonitor';
import { MonthlyReport } from './components/MonthlyReport';
import { UserManagement } from './components/UserManagement';
import { WeeklyTimetable } from './components/WeeklyTimetable';
import { AvailabilityModal } from './components/AvailabilityModal';
import { GlobalAvailabilityGrid } from './components/GlobalAvailabilityGrid';
import { OnboardingModal } from './components/OnboardingModal';
import { lessonsService } from './services/lessonsService';
import { AvailabilityDay, Lesson, UserProfile } from './types';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  ExternalLink,
  LogOut,
  Plus,
  ShieldCheck,
  Table2,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getExternalBrowserUrl, isInAppBrowser } from './lib/utils';
import { auth, db } from './lib/firebase';

const EMPTY_AVAILABILITY: AvailabilityDay[] = [];

function LoginScreen({ signIn }: { signIn: () => Promise<void> }) {
  const isBlockedLoginBrowser = isInAppBrowser();
  const externalBrowserUrl = getExternalBrowserUrl();
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoginError(null);
      await signIn();
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setLoginError('若登入視窗未跳出，請確認未開啟無痕模式並允許瀏覽器彈出視窗。');
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg-ivory p-8 text-center">
      <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mb-8 shadow-xl">
        <ShieldCheck size={48} className="text-green-700" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">游泳排程管理系統</h1>
      <p className="text-gray-500 mb-10">請先登入以開始管理您的課程</p>

      {loginError && (
        <div className="mb-4 w-full max-w-sm rounded-2xl border border-red-100 bg-red-50 p-4 text-left text-sm font-bold leading-6 text-red-600">
          {loginError}
        </div>
      )}

      {isBlockedLoginBrowser ? (
        <div className="w-full max-w-sm rounded-3xl bg-[#2a0726] p-5 text-left shadow-2xl">
          <div className="mb-3 flex items-center gap-2 text-[#d5f4d8]">
            <ExternalLink size={20} />
            <h2 className="text-base font-black">請使用外部瀏覽器登入</h2>
          </div>
          <p className="text-sm leading-7 text-white">
            為確保帳號安全，Google 不支援在通訊軟體內登入。請點擊螢幕角落選單，選擇【以預設瀏覽器開啟】(Safari / Chrome) 即可正常排課。
          </p>
          <a
            href={externalBrowserUrl.chromeSecure}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[#d5f4d8] text-sm font-black text-[#2a0726] active:scale-95 transition-transform"
          >
            嘗試用 Chrome 開啟
          </a>
          <p className="mt-3 text-xs leading-5 text-white/70">
            若按鈕沒有反應，請使用 LINE 或通訊軟體右上角選單，手動選擇以 Safari / Chrome 開啟。
          </p>
        </div>
      ) : (
        <button
          onClick={handleGoogleSignIn}
          className="w-full max-w-sm h-14 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          使用 Google 登入
        </button>
      )}
    </div>
  );
}

function MainApp() {
  const { user, profile, logout, signIn, updateDisplayName, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('schedule');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isWeeklyTimetableOpen, setIsWeeklyTimetableOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isGlobalAvailabilityOpen, setIsGlobalAvailabilityOpen] = useState(false);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>();

  useEffect(() => {
    if (!user) {
      setLessons([]);
      return;
    }

    setLessons([]);

    try {
      const unsubscribe = lessonsService.subscribeToLessons(
        selectedDate,
        (data) => setLessons(Array.isArray(data) ? data : []),
        (error) => {
          console.error(`Failed to load lessons for ${selectedDate}:`, error);
          setLessons([]);
        },
      );

      return unsubscribe;
    } catch (error) {
      console.error(`Failed to subscribe to lessons for ${selectedDate}:`, error);
      setLessons([]);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    if (!user) {
      setCoaches([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users = snapshot.docs.map((userDoc) => {
          const data = userDoc.data() as Partial<UserProfile>;
          return { ...data, uid: data.uid || userDoc.id } as UserProfile;
        });
        setCoaches(users.filter((candidate) => candidate.role === 'Coach'));
      },
      (error) => {
        console.error('Failed to subscribe to coaches:', error);
        setCoaches([]);
      },
    );

    return unsubscribe;
  }, [user]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-ivory text-green-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen signIn={signIn} />;
  }

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(format(date, 'yyyy-MM-dd'));
  };

  const handleEditLesson = (lesson: Lesson) => {
    if (lesson.coachId !== user.uid) {
      window.alert('權限不足：您只能更改自己的排課資料！');
      return;
    }

    setEditingLesson(lesson);
    setIsFormOpen(true);
  };

  const handleOpenCreateLesson = () => {
    setEditingLesson(undefined);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLesson(undefined);
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setIsEditingName(false);
      return;
    }

    try {
      await updateDisplayName(newName.trim());
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
      alert('更新名稱失敗，請稍後再試。');
    }
  };

  const handleSaveMyAvailability = async (newAvailability: AvailabilityDay[]) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      window.alert('請先登入後再儲存時間設定。');
      throw new Error('尚未登入。');
    }

    await updateDoc(doc(db, 'users', uid), { availability: newAvailability });
    window.alert('時間設定已更新');
  };

  const pageTitle =
    activeTab === 'schedule'
      ? '課程排程'
      : activeTab === 'dashboard'
        ? '泳池監控'
        : activeTab === 'reports'
          ? '月報統計'
          : activeTab === 'admin'
            ? '使用者管理'
            : '個人資料';
  const currentUserAvailability =
    coaches.find((coach) => coach.uid === user.uid)?.availability
    ?? profile?.availability
    ?? EMPTY_AVAILABILITY;

  return (
    <div className="min-h-screen bg-bg-ivory pb-32">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 p-4 pt-10 shadow-sm transition-all">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-slate-700 shadow-sm">
              SP
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">{pageTitle}</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {profile?.displayName || profile?.email || '使用者'} /{' '}
              <span className="text-green-600">已登入</span>
              </p>
            </div>
          </div>
          <button onClick={logout} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        {activeTab !== 'admin' && activeTab !== 'profile' && activeTab !== 'reports' && (
          <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-200 mb-2">
            <button onClick={() => changeDate(-1)} className="p-2 rounded-lg bg-white shadow-sm border border-slate-200 active:scale-90 transition-transform">
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">選擇日期</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {selectedDate === format(new Date(), 'yyyy-MM-dd') ? `今天 / ${selectedDate}` : selectedDate}
              </span>
            </div>
            <button onClick={() => changeDate(1)} className="p-2 rounded-lg bg-white shadow-sm border border-slate-200 active:scale-90 transition-transform">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-4"
            >
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-xl font-bold text-gray-900">當日課程</h2>
                <span className="text-xs font-medium text-gray-400">{lessons?.length ?? 0} 堂課</span>
              </div>
              {lessons?.length > 0 ? (
                lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    currentUserId={user.uid}
                    onEdit={() => handleEditLesson(lesson)}
                  />
                ))
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                  <p className="text-gray-400">該日無排課紀錄</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">泳池使用概況</h2>
                <button
                  onClick={() => setIsWeeklyTimetableOpen(true)}
                  className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#2a0726] px-3 text-[10px] font-black text-white shadow-lg active:scale-95 transition-all"
                >
                  <Table2 size={14} />
                  一週總表
                </button>
              </div>

              <PoolMonitor lessons={lessons} />

              <WeeklyTimetable
                isOpen={isWeeklyTimetableOpen}
                onClose={() => setIsWeeklyTimetableOpen(false)}
                baseDate={selectedDate}
              />

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-bold mb-4 text-gray-800">我的今日統計</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                    <p className="text-xs text-blue-600 font-bold mb-1">排課數</p>
                    <p className="text-2xl font-black text-blue-700">
                      {lessons.filter((lesson) => lesson.coachId === profile?.uid).length}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                    <p className="text-xs text-green-600 font-bold mb-1">已簽到</p>
                    <p className="text-2xl font-black text-green-700">
                      {lessons.filter((lesson) => lesson.coachId === profile?.uid && lesson.checkedIn).length}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <MonthlyReport />
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {profile?.role === 'Admin' && (
                <div className="flex justify-end px-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsGlobalAvailabilityOpen(true)}
                    className="flex h-10 items-center gap-2 rounded-lg bg-[#2a0726] px-3 text-[10px] font-black text-white shadow-lg active:scale-95 transition-all"
                  >
                    <Table2 size={14} />
                    全局教練空檔表
                  </button>
                </div>
              )}
              <UserManagement />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 space-y-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-inner">
                  <User size={40} />
                </div>

                {isEditingName ? (
                  <div className="flex flex-col items-center w-full space-y-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      placeholder="輸入顯示名稱"
                      className="w-full max-w-[200px] h-10 px-4 rounded-xl border border-slate-200 text-center font-bold outline-none focus:border-primary transition-all"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateName}
                        className="px-4 py-1.5 bg-primary text-slate-800 rounded-lg text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                      >
                        儲存
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">{profile?.displayName || '未命名使用者'}</h3>
                      <button
                        onClick={() => {
                          setNewName(profile?.displayName || '');
                          setIsEditingName(true);
                        }}
                        className="p-1 text-slate-400 hover:text-primary transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <p className="text-gray-500">{profile?.email}</p>
                  </div>
                )}

                <div className="mt-4 px-4 py-1 bg-green-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-lg shadow-green-100">
                  已登入
                </div>
              </div>

              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                <button className="w-full p-5 text-left font-medium border-b hover:bg-gray-50 flex justify-between items-center group transition-colors">
                  <span>課程通知設定</span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="w-full p-5 text-left font-medium border-b hover:bg-gray-50 flex justify-between items-center group transition-colors">
                  <span>帳號與權限</span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvailabilityOpen(true)}
                  className="w-full p-5 text-left font-medium border-b hover:bg-gray-50 flex justify-between items-center group transition-colors"
                >
                  <span>可排課時間設定</span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={logout} className="w-full p-5 text-left font-bold text-red-500 hover:bg-red-50 transition-colors">
                  登出
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {activeTab === 'schedule' && (
        <button
          onClick={handleOpenCreateLesson}
          className="fixed right-6 bottom-24 w-16 h-16 bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform shadow-green-200"
        >
          <Plus size={32} />
        </button>
      )}

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <LessonForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        existingLessons={lessons}
        editLesson={editingLesson}
      />

      <OnboardingModal userId={user.uid} isAuthenticated={Boolean(user)} />

      <AvailabilityModal
        isOpen={isAvailabilityOpen}
        onClose={() => setIsAvailabilityOpen(false)}
        initialAvailability={currentUserAvailability}
        onSave={handleSaveMyAvailability}
      />

      <GlobalAvailabilityGrid
        isOpen={isGlobalAvailabilityOpen}
        onClose={() => setIsGlobalAvailabilityOpen(false)}
        coaches={coaches}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="font-sans">
        <MainApp />
      </div>
    </AuthProvider>
  );
}
