import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Download, CheckCircle2, User as UserIcon, Users } from 'lucide-react';
import { Lesson } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { getDurationHours } from '../lib/scheduling';

export function MonthlyReport() {
  const { profile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [reportData, setReportData] = useState<any[]>([]);
  const [rawLessons, setRawLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('mine');

  const isAdmin = profile?.role === 'Admin';

  const fetchMonthlyData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const start = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');

      let q;
      if (isAdmin && viewMode === 'all') {
        q = query(
          collection(db, 'lessons'),
          where('date', '>=', start),
          where('date', '<=', end),
          where('status', '==', 'Approved'),
          where('checkedIn', '==', true)
        );
      } else {
        q = query(
          collection(db, 'lessons'),
          where('coachId', '==', profile.uid),
          where('date', '>=', start),
          where('date', '<=', end),
          where('status', '==', 'Approved'),
          where('checkedIn', '==', true)
        );
      }

      const snapshot = await getDocs(q);
      const lessons = snapshot.docs.map(d => d.data() as Lesson);
      setRawLessons(lessons);

      // Aggregate
      const stats: Record<string, { sessions: number, hours: number, name: string }> = {};
      
      lessons.forEach(l => {
        if (!stats[l.coachId]) {
          stats[l.coachId] = { sessions: 0, hours: 0, name: l.coachName };
        }
        stats[l.coachId].sessions += 1;
        stats[l.coachId].hours += getDurationHours(l.startTime, l.endTime);
      });

      setReportData(Object.values(stats));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchMonthlyData();
    }
  }, [selectedMonth, viewMode, profile]);

  const exportCSV = () => {
    if (rawLessons.length === 0) return;
    
    // Detailed Headers
    const headers = ['教練姓名', '課程日期', '開始時間', '結束時間', '泳池', '類別', '學生人數', '簽到時間'];
    
    const rows = rawLessons.map(l => {
      let checkInTimeStr = '未紀錄';
      if (l.checkInTime) {
        try {
          const dateObj = l.checkInTime.toDate ? l.checkInTime.toDate() : new Date(l.checkInTime);
          checkInTimeStr = format(dateObj, 'yyyy-MM-dd HH:mm:ss');
        } catch (e) {
          checkInTimeStr = '格式錯誤';
        }
      }

      return [
        l.coachName,
        l.date,
        l.startTime,
        l.endTime,
        l.poolType === '25m' ? '25m大池' : '教學小池',
        l.lessonType,
        l.studentCount.toString(),
        checkInTimeStr
      ];
    });
    
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = isAdmin && viewMode === 'all' 
      ? `游泳課程全體報表_${selectedMonth}.csv`
      : `游泳課程個人報表_${profile?.displayName}_${selectedMonth}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider">數據統計報表</h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-primary transition-all"
          />
        </div>

        {isAdmin && (
          <div className="flex p-1 bg-slate-100 rounded-xl w-full">
            <button
              onClick={() => setViewMode('mine')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all",
                viewMode === 'mine' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
              )}
            >
              <UserIcon size={14} />
              個人數據
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all",
                viewMode === 'all' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
              )}
            >
              <Users size={14} />
              全體教練
            </button>
          </div>
        )}
      </div>

      <div className="bg-primary/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-full text-slate-700">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">統計條件</p>
          <p className="text-xs text-slate-700 font-bold">僅計入已核准且已簽到之課程</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-5 py-4">教練</th>
                <th className="px-5 py-4 text-center">堂數</th>
                <th className="px-5 py-4 text-right">總時數</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-700 text-sm">{row.name}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-medium text-slate-600">{row.sessions}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-black text-primary">{row.hours} hr</span>
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center">
                    <p className="text-xs text-slate-300 font-black uppercase tracking-widest">目前尚無數據資料</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl shadow-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {viewMode === 'mine' ? '個人月度統計' : '全體月度統計'}
            </h3>
            <p className="text-lg font-black">{selectedMonth.replace('-', ' / ')}</p>
          </div>
          <button 
            onClick={exportCSV}
            disabled={reportData.length === 0}
            className="h-10 px-4 bg-primary text-slate-900 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
          >
            <Download size={14} />
            匯出詳細簽到紀錄 (CSV)
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-1">總課程數</p>
            <p className="text-2xl font-black">{reportData.reduce((a, b) => a + b.sessions, 0)} <span className="text-xs font-bold text-white/40">堂</span></p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-1">總教學時數</p>
            <p className="text-2xl font-black text-primary">{reportData.reduce((a, b) => a + b.hours, 0)} <span className="text-xs font-bold text-white/40">HR</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
