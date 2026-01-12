'use client';

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { Lock, LogOut } from 'lucide-react';

import SoccerField from '@/components/SoccerField';
import AdminUpload from '@/components/AdminUpload';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-slate-200 pt-10 pb-2 px-2 md:pt-16 md:pb-4 md:px-4 font-sans">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-4 px-2">
         {/* NOUVEAU TITRE */}
         <h1 className="text-lg md:text-2xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2">
           Challenge Des Services <span className="text-red-600">BUT</span>
         </h1>
         
         <div>
           {user ? (
             <div className="flex items-center gap-4">
               <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full hidden md:inline-block border border-green-200">
                 Mode Arbitre
               </span>
               <button 
                 onClick={() => auth.signOut()}
                 className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 transition shadow-xl active:scale-95"
               >
                 <LogOut className="w-4 h-4" /> Déconnexion
               </button>
             </div>
           ) : (
             <Link href="/login" className="flex items-center gap-1 text-slate-400 hover:text-blue-900 transition-colors text-[10px] font-bold uppercase tracking-wider group">
               <Lock className="w-3 h-3 group-hover:scale-110 transition-transform" /> Admin
             </Link>
           )}
         </div>
      </div>

      <div className="animate-fade-in">
        <SoccerField />
      </div>

      {user && (
        <div className="max-w-4xl mx-auto mt-12 animate-fade-in-up pb-20">
          <div className="bg-white p-1 rounded-2xl shadow-xl border-4 border-white/50">
            <AdminUpload />
          </div>
        </div>
      )}

    </main>
  );
}