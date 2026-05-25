import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BottomNavigation } from './components/BottomNavigation';
import { LessonForm } from './components/LessonForm';
import { LessonCard } from './components/LessonCard';
import { PoolMonitor } from './components/PoolMonitor';
import { MonthlyReport } from './components/MonthlyReport';
import { UserManagement } from './components/UserManagement';
import { WeeklyVenueSchedule } from './components/WeeklyVenueSchedule';
import { lessonsService } from './services/lessonsService';
import { Lesson } from './types';
import { TIME_SLOTS } from './lib/scheduling';
import { format } from 'date-fns';
import { Plus, LogOut, ChevronLeft, ChevronRight, User, ShieldCheck, Edit2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

function MainApp() {
  const { user, profile, logout, signIn, updateDisplayName, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('schedule');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isWeeklyScheduleOpen, setIsWeeklyScheduleOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>();

  useEffect(() => {
    if (user) {
      const unsubscribe = lessonsService.subscribeToLessons(selectedDate, (data) => {
        setLessons(data);
      });
      return unsubscribe;
    }
  }, [user, selectedDate]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-ivory text-green-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg-ivory p-8 text-center">
        <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mb-8 shadow-xl">
          <ShieldCheck size={48} className="text-green-700" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">游泳排程管理系統</h1>
        <p className="text-gray-500 mb-12">請先登入以開始管理您的課程</p>
        <button
          onClick={signIn}
          className="w-full max-w-sm h-14 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          使用 Google 登入
        </button>
      </div>
    );
  }

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(format(date, 'yyyy-MM-dd'));
  };

  const isAdmin = profile?.role === 'Admin';

  const handleAdminEdit = (lesson: Lesson) => {
    const isOwner = lesson.coachId === profile?.uid;
    if (!isAdmin && !isOwner) return;
    setEditingLesson(lesson);
    setIsFormOpen(true);
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
      alert('更新名稱失敗');
    }
  };

  return (
    <div className="min-h-screen bg-bg-ivory pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 p-4 pt-10 shadow-sm transition-all">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-black text-slate-700 shadow-sm">SP</div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                {activeTab === 'schedule' ? '課程排程' : activeTab === 'dashboard' ? '場館總覽' : activeTab === 'reports' ? '數據報表' : activeTab === 'admin' ? '管理中心' : '個人帳戶'}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {profile?.displayName} • <span className="text-green-600">{profile?.role === 'Admin' ? '管理員' : '教練'}</span>
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
                {selectedDate === format(new Date(), 'yyyy-MM-dd') ? '今天 / ' + selectedDate : selectedDate}
              </span>
            </div>
            <button onClick={() => changeDate(1)} className="p-2 rounded-lg bg-white shadow-sm border border-slate-200 active:scale-90 transition-transform">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
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
                <h2 className="text-xl font-bold text-gray-900">所有排程</h2>
                <span className="text-xs font-medium text-gray-400">{lessons.length} 堂課</span>
              </div>
              {lessons.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                  <p className="text-gray-400">當天尚無排課</p>
                </div>
              ) : (
                lessons.map((lesson: Lesson) => (
                  <LessonCard 
                    key={lesson.id} 
                    lesson={lesson} 
                    isAdmin={isAdmin}
                    onEdit={() => handleAdminEdit(lesson)}
                  />
                ))
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
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">場館全日動態</h2>
                <button
                  onClick={() => setIsWeeklyScheduleOpen(true)}
                  className="h-10 px-4 bg-primary text-slate-900 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  <Calendar size={14} />
                  查看週課表
                </button>
              </div>
              
              <PoolMonitor 
                lessons={lessons} 
              />

              <WeeklyVenueSchedule 
                isOpen={isWeeklyScheduleOpen}
                onClose={() => setIsWeeklyScheduleOpen(false)}
                baseDate={selectedDate}
              />
              
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-bold mb-4 text-gray-800">我的今日統計</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                    <p className="text-xs text-blue-600 font-bold mb-1">今日課程</p>
                    <p className="text-2xl font-black text-blue-700">
                      {lessons.filter(l => l.coachId === profile?.uid).length}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                    <p className="text-xs text-green-600 font-bold mb-1">已簽到</p>
                    <p className="text-2xl font-black text-green-700">
                      {lessons.filter(l => l.coachId === profile?.uid && l.checkedIn).length}
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

          {activeTab === 'admin' && isAdmin && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
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
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="輸入新名稱"
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
                      <h3 className="text-xl font-bold">{profile?.displayName}</h3>
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
                  {profile?.role === 'Admin' ? '管理員' : '教練'}
                </div>
              </div>

              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                <button className="w-full p-5 text-left font-medium border-b hover:bg-gray-50 flex justify-between items-center group transition-colors">
                  <span>排班規則說明</span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="w-full p-5 text-left font-medium border-b hover:bg-gray-50 flex justify-between items-center group transition-colors">
                  <span>聯絡管理員</span>
                  <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={logout} className="w-full p-5 text-left font-bold text-red-500 hover:bg-red-50 transition-colors">登出帳號</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FAB */}
      {activeTab === 'schedule' && (
        <button
          onClick={() => {
            setEditingLesson(undefined);
            setIsFormOpen(true);
          }}
          className="fixed right-6 bottom-24 w-16 h-16 bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform shadow-green-200"
        >
          <Plus size={32} />
        </button>
      )}

      {/* Bottom Nav */}
      <BottomNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={isAdmin} 
      />

      {/* Form Bottom Sheet */}
      <LessonForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        existingLessons={lessons}
        editLesson={editingLesson}
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
