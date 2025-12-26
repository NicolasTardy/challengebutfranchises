'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Send, X, Shield, Swords } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: string;
  region: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: any;
}

interface StoreSimple {
  name: string;
  region: string;
}

export default function ChallengeChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [identity, setIdentity] = useState<StoreSimple | null>(null);
  const [inputMsg, setInputMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [stores, setStores] = useState<StoreSimple[]>([]);
  
  // Référence pour le scroll automatique vers le bas
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Charger la liste des magasins (pour l'identification)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "daily_stats"), (snapshot) => {
      const storesList: StoreSimple[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'store') {
          storesList.push({ name: data.name, region: data.region });
        }
      });
      // Tri alphabétique
      storesList.sort((a, b) => a.name.localeCompare(b.name));
      setStores(storesList);
    });
    return () => unsubscribe();
  }, []);

  // 2. Écouter les messages en temps réel
  useEffect(() => {
    if (!isOpen) return;

    // On prend les 50 derniers messages
    const q = query(collection(db, "challenges"), orderBy("createdAt", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs.reverse()); // On inverse pour avoir les récents en bas
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Scroll automatique en bas quand un message arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 3. Envoyer un message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !identity) return;

    await addDoc(collection(db, "challenges"), {
      text: inputMsg,
      sender: identity.name,
      region: identity.region,
      createdAt: Timestamp.now()
    });

    setInputMsg("");
  };

  // --- RENDU ---

  // Si fermé : Juste le bouton flottant
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl border-4 border-white transition-transform hover:scale-110 animate-bounce-slow flex items-center gap-2 group"
      >
        <Swords className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap">
          Lancer un Défi
        </span>
      </button>
    );
  }

  // Si ouvert
  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm h-[500px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden animate-fade-in-up">
      
      {/* Header */}
      <div className="bg-red-700 p-3 flex items-center justify-between text-white shadow-lg shrink-0">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-yellow-400" />
          <h3 className="font-bold uppercase tracking-wider text-sm">Mur des Défis</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-black/20 p-1 rounded transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* CONTENU */}
      {!identity ? (
        // ÉCRAN 1 : Identification
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white">
          <Shield className="w-12 h-12 text-slate-500 mb-4" />
          <h4 className="text-lg font-bold mb-2">Qui êtes-vous ?</h4>
          <p className="text-xs text-slate-400 mb-6">Identifiez-vous pour défier vos collègues.</p>
          
          <select 
            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white mb-4 focus:ring-2 focus:ring-red-500 outline-none"
            onChange={(e) => {
              const store = stores.find(s => s.name === e.target.value);
              if (store) setIdentity(store);
            }}
            defaultValue=""
          >
            <option value="" disabled>Choisir mon magasin...</option>
            {stores.map((s, i) => (
              <option key={i} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      ) : (
        // ÉCRAN 2 : Le Chat
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800/50 custom-scrollbar" ref={scrollRef}>
            <div className="text-center text-[10px] text-slate-500 py-2">
              Historique des défis - Soyez fair-play ! 🥊
            </div>
            
            {messages.map((msg) => {
              const isMe = msg.sender === identity.name;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-xl p-3 text-sm shadow-sm relative ${
                    isMe 
                      ? 'bg-red-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 rounded-tl-none'
                  }`}>
                    {!isMe && (
                      <div className="text-[10px] font-bold text-red-600 mb-1 uppercase flex items-center gap-1">
                        {msg.sender} <span className="text-slate-400 font-normal normal-case">• {msg.region}</span>
                      </div>
                    )}
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">
                    {msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Zone de saisie */}
          <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
            <input 
              type="text" 
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Lancez un défi..." 
              className="flex-1 bg-slate-800 text-white text-sm rounded-full px-4 py-2 border border-slate-600 focus:border-red-500 focus:outline-none placeholder:text-slate-500"
            />
            <button 
              type="submit" 
              disabled={!inputMsg.trim()}
              className="bg-red-600 text-white p-2 rounded-full hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          
          <div className="bg-slate-950 text-[9px] text-slate-500 p-1 text-center flex justify-between px-4">
             <span>Connecté en tant que : <b className="text-slate-300">{identity.name}</b></span>
             <button onClick={() => setIdentity(null)} className="hover:text-red-400 underline">Changer</button>
          </div>
        </>
      )}
    </div>
  );
}