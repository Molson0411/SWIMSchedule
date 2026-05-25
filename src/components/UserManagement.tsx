import React, { useState, useEffect } from 'react';
import { usersService } from '../services/usersService';
import { UserProfile } from '../types';
import { Shield, ShieldAlert, User as UserIcon, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = usersService.subscribeToUsers(setUsers);
    return unsubscribe;
  }, []);

  const handleRoleToggle = async (user: UserProfile) => {
    if (user.uid === profile?.uid) return; // Prevent self-demotion
    
    setUpdating(user.uid);
    try {
      const newRole = user.role === 'Admin' ? 'Coach' : 'Admin';
      await usersService.updateUserRole(user.uid, newRole);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={20} className="text-primary" />
        <h2 className="text-xl font-bold text-slate-800">人員權限管理</h2>
      </div>

      <div className="space-y-3">
        {users.map(user => (
          <div key={user.uid} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <UserIcon size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-800">{user.displayName || user.email}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  目前身份: <span className={cn(user.role === 'Admin' ? "text-primary" : "text-slate-500")}>{user.role === 'Admin' ? '管理員' : '教練'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => handleRoleToggle(user)}
              disabled={updating === user.uid || user.uid === profile?.uid}
              className={cn(
                "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                user.role === 'Admin' 
                  ? "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500" 
                  : "bg-primary/20 text-slate-700 hover:bg-primary shadow-sm"
              )}
            >
              {updating === user.uid ? '處理中...' : user.role === 'Admin' ? '降級為教練' : '升級為管理員'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
