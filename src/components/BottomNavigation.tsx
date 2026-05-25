import React from 'react';
import { motion } from 'motion/react';
import { Calendar, LayoutDashboard, Settings, UserCircle, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
}

export function BottomNavigation({ activeTab, setActiveTab, isAdmin }: BottomNavProps) {
  const tabs = [
    { id: 'schedule', label: '排課', icon: Calendar },
    { id: 'dashboard', label: '總覽', icon: LayoutDashboard },
    { id: 'reports', label: '報表', icon: FileText },
    ...(isAdmin ? [{ id: 'admin', label: '管理', icon: Settings }] : []),
    { id: 'profile', label: '個人', icon: UserCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-all relative",
                isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div className={cn(
                "p-1 rounded-lg transition-all",
                isActive ? "bg-primary shadow-inner" : "bg-transparent"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] mt-1 font-bold uppercase tracking-wider transition-all",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute top-0 w-8 h-1 bg-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
