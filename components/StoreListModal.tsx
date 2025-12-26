'use client';

import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { 
  X, Store, Trophy, Flame, 
  MessageCircle, Send, Swords, Trash2, Target 
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- CONFIG ---
const START_DATE = new Date("2026-01-05");
const END_DATE = new Date("2026-02-06");
const FAKE_TODAY = null; 

interface StoreData {
  id: string;
  name: string;
  points: number;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  target?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: any;
}

interface ModalProps {
  regionName: string;       // LE VRAI NOM (Pour la base de données)
  regionDisplayName?: string; // LE PSEUDO (Pour l'affichage)
  onClose: () => void;
}

export default function StoreListModal({ regionName, regionDisplayName, onClose }: ModalProps) {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // États dynamiques
  const [goalScore, setGoalScore] = useState(100000);
  const [timeProgress, setTimeProgress] = useState(0);

  // États Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatSender, setChatSender] = useState("");
  const [chatTarget, setChatTarget] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Titre à afficher (Pseudo ou Nom réel)
  const title = regionDisplayName || regionName;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => setIsAdmin(!!user));

    const fetchStores = async () => {
      // ON UTILISE TOUJOURS regionName (le vrai nom) POUR CHERCHER DANS LA BASE
      const q = query(collection(db, "daily_stats"), where("region", "==", regionName));
      const querySnapshot = await getDocs(q);
       
      const storesList: StoreData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'store') {
          storesList.push({ id: doc.id, name: data.name, points: data.percent_obj || 0 });
        }
      });
      storesList.sort((a, b) => b.points - a.points);
       
      const now = FAKE_TODAY || new Date(); 
      const totalDuration = END_DATE.getTime() - START_DATE.getTime();
      let elapsed = now.getTime() - START_DATE.getTime();
      if (elapsed < 0) elapsed = 1000 * 60 * 60 * 24; 
      if (elapsed > totalDuration) elapsed = totalDuration;
      const progressRatio = elapsed / totalDuration;

      const leaderScore = storesList.length > 0 ? storesList[0].points : 0;
      const safeLeader = leaderScore > 0 ? leaderScore : 1000;
      let projectedGoal = (safeLeader / progressRatio) * 1.05;
      if (progressRatio < 0.05) projectedGoal = safeLeader * 20;

      setStores(storesList);
      setGoalScore(Math.floor(projectedGoal));
      setTimeProgress(progressRatio);
      setLoading(false);
    };

    fetchStores();

    // Chat aussi avec le vrai nom
    const qMessages = query(
      collection(db, "store_messages"), 
      where("region", "==", regionName), 
      orderBy("createdAt", "asc"), 
      limit(50)
    );
    
    const unsubChat = onSnapshot(qMessages, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => { unsubAuth(); unsubChat(); };
  }, [regionName]);

  const getPosition = (score: number) => {
    const pct = (score / goalScore) * 93;
    return Math.min(Math.max(pct, 2), 93);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatSender) return;

    await addDoc(collection(db, "store_messages"), {
      text: newMessage,
      sender: chatSender,
      target: chatTarget,
      region: regionName, // Toujours le vrai nom pour stocker
      createdAt: serverTimestamp()
    });
    setNewMessage("");
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (confirm("Supprimer ce message ?")) {
      try { await deleteDoc(doc(db, "store_messages", msgId)); } catch (e) { console.error(e); }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden border border-white/20">
        
        {/* EN-TÊTE AVEC LE PSEUDO */}
        <div className="bg-gradient-to-r from-red-700 to-red-900 p-4 flex items-center justify-between text-white shrink-0 shadow-lg z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
              <Store className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Vestiaire Régional</h2>
              <p className="text-red-200 text-sm font-medium flex items-center gap-2">
                <span className="opacity-70">Équipe</span> 
                {/* On affiche le TITRE (Pseudo) ici */}
                <span className="bg-white text-red-800 px-1.5 rounded font-bold">{title}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all hover:rotate-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar flex flex-col">
          
          {/* MINI TERRAIN */}
          {!loading && stores.length > 0 && (
            <div className="p-4 bg-slate-200/50 border-b border-slate-300 shrink-0">
              <div className="mb-2 flex items-center justify-between">
                 <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                   <Trophy className="w-4 h-4 text-yellow-600" /> Course Interne
                 </h3>
                 <span className="text-[10px] text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-200">
                   Projection Leader : {goalScore.toLocaleString()} pts
                 </span>
              </div>

              <div className="relative h-[200px] md:h-[250px] w-full rounded-xl overflow-hidden shadow-inner bg-emerald-700 border-2 border-slate-300 select-none">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/grass.png')]"></div>
                <div className="absolute top-0 bottom-0 w-[2px] bg-yellow-400/80 z-0 transition-all duration-1000 ease-out" style={{ left: `${timeProgress * 93}%` }}></div>
                <div className="absolute right-0 top-0 bottom-0 w-[8%] bg-red-600 border-l-[4px] border-white flex items-center justify-center shadow-lg z-0">
                   <div className="relative w-full aspect-square border-[3px] border-white bg-red-600 flex items-center justify-center transform -rotate-90">
                      <span className="text-white font-black text-xs md:text-xl tracking-tighter">BUT</span>
                   </div>
                </div>

                {stores.map((store, index) => {
                  const safePosition = getPosition(store.points);
                  const isAhead = safePosition > (timeProgress * 93);
                  const lane = index % 8; 
                  const topPos = 10 + (lane * 10); 
                  return (
                    <motion.div
                      key={store.id}
                      initial={{ left: 0, opacity: 0 }}
                      animate={{ left: `${safePosition}%`, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 60, delay: index * 0.05 }}
                      className="absolute z-10 group"
                      style={{ top: `${topPos}%` }}
                    >
                      <div className="relative -ml-3 flex flex-col items-center">
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-slate-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-50">
                          {store.name} : {store.points.toLocaleString()} pts
                        </div>
                        <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full shadow-md border flex items-center justify-center text-[7px] font-black
                          ${isAhead ? 'bg-yellow-400 border-white text-yellow-900 ring-2 ring-yellow-400/50' : 'bg-white border-slate-200 text-slate-700'}
                        `}>
                           {index + 1}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SECTION DU BAS */}
          <div className="flex-1 flex flex-col md:flex-row min-h-[400px]">
            
            {/* CLASSEMENT */}
            <div className="flex-1 border-r border-slate-200 bg-white overflow-y-auto custom-scrollbar">
              <div className="sticky top-0 bg-slate-100 p-2 text-xs font-bold text-slate-500 uppercase border-b border-slate-200 flex justify-between">
                <span>Classement</span>
                <span>Points</span>
              </div>
              <table className="w-full text-sm text-left text-slate-600">
                <tbody className="divide-y divide-slate-100">
                  {stores.map((store, index) => (
                    <tr key={store.id} className="hover:bg-red-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-400 w-12">#{index+1}</td>
                      <td className="px-2 py-3 font-medium text-slate-900 flex items-center gap-2">
                         {store.name}
                         {index === 0 && <Flame className="w-3 h-3 text-orange-500 animate-pulse" />}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800">
                        {store.points.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CHAT */}
            <div className="w-full md:w-[450px] bg-slate-900 text-white flex flex-col">
               <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
                 <MessageCircle className="w-4 h-4 text-yellow-400" />
                 <span className="text-xs font-bold uppercase">Chat Inter-Magasins</span>
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-900/50">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs">
                      <Swords className="w-8 h-8 mb-2 opacity-50" />
                      Pas encore de défi... Lancez-vous !
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isMe = msg.sender === chatSender;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in group`}>
                         <div className="flex items-center gap-1 mb-1 text-[9px] uppercase tracking-wide text-slate-400">
                            <span className={isMe ? 'text-blue-300 font-bold' : ''}>{msg.sender}</span>
                            {msg.target && <><Swords className="w-3 h-3 text-red-500 mx-0.5" /><span className="text-red-300 font-bold">{msg.target}</span></>}
                            {isAdmin && <button onClick={() => handleDeleteMessage(msg.id)} className="ml-2 text-slate-500 hover:text-red-500" title="Supprimer"><Trash2 className="w-3 h-3" /></button>}
                         </div>
                         <div className={`px-3 py-2 rounded-lg text-xs max-w-[90%] shadow-md border ${isMe ? 'bg-blue-600/80 border-blue-500 text-white rounded-tr-none' : 'bg-slate-700/80 border-slate-600 text-slate-200 rounded-tl-none'}`}>{msg.text}</div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
               </div>
               <form onSubmit={handleSendMessage} className="p-3 bg-slate-800 border-t border-slate-700">
                  <div className="flex gap-2 mb-2">
                    <select className="flex-1 bg-slate-900 text-blue-200 text-[10px] font-bold py-1.5 px-2 rounded border border-blue-500/30 focus:border-blue-500 outline-none" value={chatSender} onChange={e => setChatSender(e.target.value)}>
                      <option value="">Je suis...</option>
                      {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <div className="flex items-center"><Target className="w-3 h-3 text-slate-500" /></div>
                    <select className="flex-1 bg-slate-900 text-red-200 text-[10px] font-bold py-1.5 px-2 rounded border border-red-500/30 focus:border-red-500 outline-none" value={chatTarget} onChange={e => setChatTarget(e.target.value)}>
                      <option value="">Cible...</option>
                      {stores.filter(s => s.name !== chatSender).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  {chatSender && chatTarget && (
                     <div className="mb-2 text-[10px] text-center font-bold bg-black/40 p-1 rounded border border-white/5">
                        {(() => {
                           const s1 = stores.find(s => s.name === chatSender)?.points || 0;
                           const s2 = stores.find(s => s.name === chatTarget)?.points || 0;
                           const diff = s1 - s2;
                           return diff > 0 ? <span className="text-green-400">🚀 Je te bats de {diff.toLocaleString()} pts !</span> : <span className="text-red-400">🐢 J&apos;ai {Math.abs(diff).toLocaleString()} pts de retard...</span>
                        })()}
                     </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" className="flex-1 bg-black/50 text-white text-xs p-2.5 rounded-lg border border-white/10 focus:border-yellow-400 outline-none placeholder:text-slate-500" placeholder={chatSender ? "Tailler un short..." : "Identifiez-vous..."} value={newMessage} onChange={e => setNewMessage(e.target.value)} disabled={!chatSender} />
                    <button type="submit" disabled={!chatSender || !newMessage.trim()} className="bg-yellow-500 text-black p-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors"><Send className="w-4 h-4" /></button>
                  </div>
               </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}