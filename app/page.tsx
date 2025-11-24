'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AdminUpload from '@/components/AdminUpload';
import SoccerField from '@/components/SoccerField';
import Link from 'next/link';
import { LogIn, LogOut, ShieldCheck, MousePointerClick } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On écoute l'état de connexion au chargement de la page
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-50 p-4 md:p-8 relative">
      
      {/* Bouton de Connexion / Déconnexion en haut à droite */}
      <div className="absolute top-4 right-4 z-50">
        {user ? (
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 bg-white px-3 py-2 rounded-full shadow-sm border border-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        ) : (
          <Link 
            href="/login"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-white px-3 py-2 rounded-full shadow-sm border border-slate-200 transition-colors"
          >
            <LogIn className="w-4 h-4" /> Admin
          </Link>
        )}
      </div>

      <div className="w-full max-w-7xl space-y-6 mt-4">
        
        <div className="text-center mb-6 space-y-4">
          {/* NOUVEAU TITRE */}
          <h1 className="text-3xl md:text-5xl font-extrabold text-blue-900 tracking-tight uppercase">
            Le grand challenge des Services BUT
          </h1>
          
          {/* NOUVELLE PHRASE D'EXPLICATION */}
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm md:text-base font-medium animate-bounce-subtle border border-blue-200 shadow-sm">
            <MousePointerClick className="w-5 h-5" />
            <span>Cliquez sur le blason de votre région pour voir le classement de votre magasin !</span>
          </div>
        </div>
        
        {/* LE TERRAIN DE JEU */}
        <section className="w-full">
           <SoccerField />
        </section>

        {/* ZONE ADMIN (Visible seulement si connecté) */}
        {user ? (
          <div className="max-w-xl mx-auto mt-12 animate-fade-in">
            <div className="flex items-center gap-2 mb-4 justify-center text-green-700 font-medium">
              <ShieldCheck className="w-5 h-5" /> Mode Administrateur Activé
            </div>
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <AdminUpload />
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 text-xs mt-8 italic opacity-60">
            Plateforme de suivi temps réel - BUT France
          </div>
        )}
        
      </div>
    </main>
  );
}