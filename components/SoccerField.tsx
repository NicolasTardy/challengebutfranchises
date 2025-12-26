'use client';

import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, limit, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, CalendarClock, Quote, Swords, X, Send, MessageCircle, Target,
  TrendingUp, Frown, PackageX, Globe, Users, XCircle, CloudRain, AlertTriangle, 
  GraduationCap, Clock, Wallet, HardHat, ShieldBan, HelpCircle, Trash2,
  PlayCircle, MonitorPlay, Edit2, Map, ShieldAlert 
} from 'lucide-react';
import StoreListModal from './StoreListModal';

// --- CONFIGURATION ---
const START_DATE = new Date("2026-01-05");
const END_DATE = new Date("2026-02-06");
const FAKE_TODAY = null; 

// 📺 URL des vidéos de formation
const VIDEO_URL_PRESENTATION = "https://www.youtube.com/embed/C4suoKc1exc"; 
const VIDEO_URL_OBJECTIONS = "https://www.youtube.com/embed/0jngayzx-jQ"; 

const OBSTACLES = [
  { name: "Inflation", pos: 8, icon: TrendingUp, color: "text-red-400", desc: "Le prix monte ? Montez le niveau de service !" },
  { name: "Morosité", pos: 14, icon: Frown, color: "text-slate-400", desc: "Soyez le rayon de soleil du client." },
  { name: "Pénurie Produits", pos: 20, icon: PackageX, color: "text-orange-400", desc: "Vendez ce qui est disponible !" },
  { name: "PurePlayers", pos: 26, icon: Globe, color: "text-blue-400", desc: "Le conseil humain est irremplaçable." },
  { name: "Baisse Fréq.", pos: 32, icon: Users, color: "text-purple-400", desc: "Chaque visiteur doit devenir un client." },
  { name: "Turnover", pos: 38, icon: XCircle, color: "text-yellow-400", desc: "Intégrez vite, formez mieux." },
  { name: "Pouvoir d'achat en baisse", pos: 44, icon: Wallet, color: "text-red-500", desc: "Proposez le paiement en plusieurs fois." },
  { name: "Météo", pos: 50, icon: CloudRain, color: "text-cyan-300", desc: "Il pleut ? Vendez du confort intérieur !" },
  { name: "Bug Info", pos: 56, icon: AlertTriangle, color: "text-amber-400", desc: "Restez zen, le papier marche toujours." },
  { name: "Manque Formation", pos: 62, icon: GraduationCap, color: "text-pink-400", desc: "La compétence crée la confiance." },
  { name: "Retard Liv.", pos: 68, icon: Clock, color: "text-orange-500", desc: "Anticipez et communiquez." },
  { name: "Charges", pos: 74, icon: TrendingUp, color: "text-red-600", desc: "Optimisez chaque ressource." },
  { name: "Pessimisme", pos: 80, icon: Frown, color: "text-gray-400", desc: "L'énergie positive est contagieuse." },
  { name: "Travaux", pos: 86, icon: HardHat, color: "text-yellow-500", desc: "C'est temporaire, la qualité reste." },
  { name: "Résistance au changement", pos: 92, icon: ShieldBan, color: "text-stone-400", desc: "Le changement est une opportunité." },
];

interface RegionData {
  id: string;
  name: string;
  pseudo?: string;
  current_score_obj: number;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  target?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: any;
}

export default function SoccerField() {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // --- ÉTATS MODALES ---
  const [showDuelModal, setShowDuelModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // --- ÉTAT VIDÉO (Onglets) ---
  const [activeVideoTab, setActiveVideoTab] = useState<'presentation' | 'objections'>('presentation');
  
  // --- ÉTATS DUEL & CHAT ---
  const [duelLeftId, setDuelLeftId] = useState<string>("");
  const [duelRightId, setDuelRightId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatSender, setChatSender] = useState(""); 
  const [chatTarget, setChatTarget] = useState(""); 
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- ÉTATS JEU ---
  const [goalScore, setGoalScore] = useState(100000); 
  const [timeProgress, setTimeProgress] = useState(0); 
  const [daysElapsed, setDaysElapsed] = useState(1);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => setIsAdmin(!!user));

    const unsubRegions = onSnapshot(collection(db, "regions"), (snapshot) => {
      const regionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RegionData[];
        
      regionsList.sort((a, b) => a.name.localeCompare(b.name));

      const now = FAKE_TODAY || new Date(); 
      const totalDuration = END_DATE.getTime() - START_DATE.getTime();
      let elapsed = now.getTime() - START_DATE.getTime();
      if (elapsed < 0) elapsed = 1000 * 60 * 60 * 24; 
      if (elapsed > totalDuration) elapsed = totalDuration;
      const progressRatio = elapsed / totalDuration; 
      const days = Math.ceil(elapsed / (1000 * 60 * 60 * 24));
        
      const leaderScore = Math.max(...regionsList.map(r => r.current_score_obj || 0));
      const safeLeaderScore = leaderScore > 0 ? leaderScore : 1000;
      let projectedGoal = (safeLeaderScore / progressRatio) * 1.05;
      if (progressRatio < 0.05) projectedGoal = safeLeaderScore * 20; 

      setRegions(regionsList);
      setGoalScore(Math.floor(projectedGoal));
      setTimeProgress(progressRatio);
      setDaysElapsed(days);
    });

    const qMessages = query(collection(db, "messages"), orderBy("createdAt", "asc"), limit(50));
    const unsubChat = onSnapshot(qMessages, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => { unsubAuth(); unsubRegions(); unsubChat(); };
  }, []);

  const getPosition = (score: number) => {
    const pct = (score / goalScore) * 93; 
    return Math.min(Math.max(pct, 2), 93);
  };

  const getRegionById = (id: string) => regions.find(r => r.id === id);
  
  const getDisplayName = (r?: RegionData) => r ? (r.pseudo || r.name) : "???";

  // CORRECTION ICI : Meilleure gestion des initiales pour supprimer "BUT" et "FRANCHISE"
  const getInitials = (name: string) => {
    if (!name) return "??";
    const cleanName = name.replace(/BUT /i, '').replace(/FRANCHISE /i, '').trim(); 
    const parts = cleanName.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  const handleUpdatePseudo = async (regionId: string, currentPseudo: string) => {
    const newPseudo = prompt("Nouveau nom d'équipe (Pseudo) :", currentPseudo);
    if (newPseudo !== null) {
      try {
        await updateDoc(doc(db, "regions", regionId), { pseudo: newPseudo });
      } catch (e) { console.error("Erreur update:", e); }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatSender) return;
    await addDoc(collection(db, "messages"), {
      text: newMessage,
      sender: chatSender,
      target: chatTarget,
      createdAt: serverTimestamp()
    });
    setNewMessage("");
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (confirm("Supprimer ce message ?")) {
      try { await deleteDoc(doc(db, "messages", msgId)); } catch (e) { console.error(e); }
    }
  };

  return (
    <>
      {selectedRegion && (
        <StoreListModal 
          regionName={selectedRegion.name} 
          regionDisplayName={selectedRegion.pseudo || selectedRegion.name} 
          onClose={() => setSelectedRegion(null)} 
        />
      )}

      {/* --- MODALE VIDÉOS --- */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-5xl flex flex-col items-center animate-scale-in">
             
            <div className="w-full flex justify-between items-center text-white mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.7)]">
                  <MonitorPlay className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest text-red-500">Formation X&apos;press</h2>
                  <p className="text-sm text-slate-400">2 minutes pour devenir un expert</p>
                </div>
              </div>
              <button onClick={() => setShowVideoModal(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all flex items-center gap-2 group">
                <span className="text-xs font-bold uppercase hidden group-hover:block">Fermer</span>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* SÉLECTEUR DE VIDÉOS */}
            <div className="flex w-full mb-4 bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setActiveVideoTab('presentation')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
                  activeVideoTab === 'presentation' 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Map className="w-4 h-4" /> 1. Présenter la Carte
              </button>
              <button 
                onClick={() => setActiveVideoTab('objections')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all ${
                  activeVideoTab === 'objections' 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldAlert className="w-4 h-4" /> 2. Traiter les Objections
              </button>
            </div>

            <div className="mb-2 text-center">
                <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                  {activeVideoTab === 'presentation' ? (
                    <>🎯 Module 1 : Comment présenter la carte simplement ?</>
                  ) : (
                    <>🛡️ Module 2 : Comment répondre aux &quot;Non&quot; ?</>
                  )}
                </h3>
            </div>

            <div className="relative w-full aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-800">
              <iframe 
                key={activeVideoTab} 
                width="100%" height="100%" 
                src={activeVideoTab === 'presentation' ? VIDEO_URL_PRESENTATION : VIDEO_URL_OBJECTIONS}
                title="Formation Video"
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>

            <div className="mt-8 text-center">
              <button 
                onClick={() => setShowVideoModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-full transition-transform uppercase tracking-widest flex items-center gap-2 mx-auto"
              >
                <X className="w-4 h-4" /> Retour au Terrain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE AIDE --- */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-md w-full relative shadow-2xl">
            <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><HelpCircle className="text-blue-400" /> Mode d&apos;emploi</h2>
            <div className="space-y-6">
              <div className="bg-slate-700/50 p-4 rounded-xl border-l-4 border-red-500">
                <h3 className="text-sm font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Swords className="w-4 h-4" /> Pour les DR</h3>
                <p className="text-slate-300 text-xs leading-relaxed">Cliquez sur <b>&quot;Espace DR&quot;</b>. Simulez des duels et postez sur le Mur.</p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-xl border-l-4 border-yellow-500">
                <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Magasins</h3>
                <p className="text-slate-300 text-xs leading-relaxed">Cliquez sur <b>votre Région</b> sur la carte pour voir le classement.</p>
              </div>
            </div>
            <button onClick={() => setShowHelpModal(false)} className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors">Compris !</button>
          </div>
        </div>
      )}

      {/* --- MODALE DUEL & CHAT DR --- */}
      {showDuelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/20 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden relative flex flex-col md:flex-row h-[85vh] md:h-[80vh]">
            <button onClick={() => setShowDuelModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white z-50"><X /></button>
            
            {/* GAUCHE: DUEL */}
            <div className="flex-1 p-6 flex flex-col border-b md:border-b-0 md:border-r border-white/10 bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center justify-center gap-2"><Swords className="w-6 h-6 text-yellow-400" /> Duel des DR</h2>
                <p className="text-white/40 text-xs">Simulateur & Provocations</p>
              </div>
              <div className="flex flex-col gap-6 flex-1 justify-center">
                 <div className="flex items-center gap-4 justify-between">
                    <div className="flex-1 text-center">
                      <label className="text-[10px] text-blue-300 font-bold uppercase block mb-1">Ma Région</label>
                      <select className="w-full bg-slate-800 text-white p-2 rounded border border-blue-500/30 text-sm font-bold" value={duelLeftId} onChange={(e) => setDuelLeftId(e.target.value)}>
                        <option value="">Choisir...</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{getDisplayName(r)}</option>)}
                      </select>
                      {duelLeftId && <div className="mt-2 text-2xl font-black text-blue-400">{getRegionById(duelLeftId)?.current_score_obj.toLocaleString()} pts</div>}
                    </div>
                    <div className="font-black text-yellow-400 text-xl italic">VS</div>
                    <div className="flex-1 text-center">
                      <label className="text-[10px] text-red-300 font-bold uppercase block mb-1">Mon Rival</label>
                      <select className="w-full bg-slate-800 text-white p-2 rounded border border-red-500/30 text-sm font-bold" value={duelRightId} onChange={(e) => setDuelRightId(e.target.value)}>
                        <option value="">Choisir...</option>
                        {regions.filter(r => r.id !== duelLeftId).map(r => <option key={r.id} value={r.id}>{getDisplayName(r)}</option>)}
                      </select>
                      {duelRightId && <div className="mt-2 text-2xl font-black text-red-400">{getRegionById(duelRightId)?.current_score_obj.toLocaleString()} pts</div>}
                    </div>
                 </div>
                 {duelLeftId && duelRightId && (
                    <div className="bg-white/5 p-4 rounded-xl text-center border border-white/10 animate-pulse">
                       {(() => {
                          const diff = (getRegionById(duelLeftId)?.current_score_obj || 0) - (getRegionById(duelRightId)?.current_score_obj || 0);
                          return diff > 0 ? <div className="text-green-400 font-bold">🚀 Avance de <span className="text-xl">{diff.toLocaleString()}</span> pts !</div> : <div className="text-orange-400 font-bold">🐢 Retard de <span className="text-xl">{Math.abs(diff).toLocaleString()}</span> pts.</div>
                       })()}
                    </div>
                 )}
              </div>
            </div>

            {/* DROITE: CHAT */}
            <div className="w-full md:w-[400px] bg-black/30 flex flex-col h-1/2 md:h-auto border-l border-white/10">
               <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-slate-800/80 backdrop-blur">
                  <MessageCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Mur des Défis (DR)</span>
                  <span className="ml-auto flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar bg-slate-900/60">
                  {messages.map((msg) => {
                    const isMe = msg.sender === chatSender;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in group`}>
                         <div className="flex items-center gap-1 mb-1 text-[9px] uppercase tracking-wide">
                            <span className={`font-black ${isMe ? 'text-blue-300' : 'text-slate-400'}`}>{msg.sender}</span>
                            {msg.target && <><Swords className="w-3 h-3 text-red-500 mx-0.5" /><span className="text-red-300 font-bold">{msg.target}</span></>}
                            {isAdmin && <button onClick={() => handleDeleteMessage(msg.id)} className="ml-2 text-slate-600 hover:text-red-500 transition-colors p-1" title="Supprimer"><Trash2 className="w-3 h-3" /></button>}
                         </div>
                         <div className={`px-3 py-2 rounded-lg text-xs max-w-[95%] shadow-md border ${isMe ? 'bg-blue-600/90 border-blue-500 text-white rounded-tr-none' : 'bg-slate-700/90 border-slate-600 text-slate-200 rounded-tl-none'}`}>{msg.text}</div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
               </div>
               <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-slate-800/90">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 relative">
                       <select className="w-full bg-slate-900 text-blue-200 text-[10px] font-bold py-1.5 px-2 rounded border border-blue-500/30 focus:border-blue-500 outline-none appearance-none" value={chatSender} onChange={e => setChatSender(e.target.value)}>
                          <option value="">Je suis...</option>
                          {regions.map(r => <option key={r.id} value={getDisplayName(r)}>{getDisplayName(r)}</option>)}
                       </select>
                    </div>
                    <div className="flex items-center justify-center"><Target className="w-3 h-3 text-white/30" /></div>
                    <div className="flex-1 relative">
                       <select className="w-full bg-slate-900 text-red-200 text-[10px] font-bold py-1.5 px-2 rounded border border-red-500/30 focus:border-red-500 outline-none appearance-none" value={chatTarget} onChange={e => setChatTarget(e.target.value)}>
                          <option value="">Cible...</option>
                          {regions.filter(r => getDisplayName(r) !== chatSender).map(r => <option key={r.id} value={getDisplayName(r)}>{getDisplayName(r)}</option>)}
                       </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" className="flex-1 bg-black/50 text-white text-xs p-2.5 rounded-lg border border-white/10 focus:border-yellow-400 outline-none placeholder:text-slate-500" placeholder={chatSender ? "Votre défi..." : "Identifiez-vous..."} value={newMessage} onChange={e => setNewMessage(e.target.value)} disabled={!chatSender} />
                    <button type="submit" disabled={!chatSender || !newMessage.trim()} className="bg-yellow-500 text-black p-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50"><Send className="w-4 h-4" /></button>
                  </div>
               </form>
            </div>
          </div>
        </div>
      )}

      {/* --- BANDEAU MOTIVATION --- */}
      <div className="mb-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 border-l-4 border-yellow-400 shadow-lg flex flex-col md:flex-row items-start md:items-center gap-4 text-white justify-between">
         <div className="flex items-center gap-4 flex-1">
            <div className="bg-yellow-400/10 p-2 rounded-full shrink-0"><Quote className="w-6 h-6 text-yellow-400" /></div>
            <div>
              <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">Le mot du Coach</h3>
              <p className="text-sm md:text-base font-medium italic text-slate-200">&quot;Ce ne sont pas des obstacles, ce sont des étapes vers la victoire. <span className="text-white font-bold not-italic"> Prouvez que vous êtes les meilleurs commerçants de France !</span>&quot;</p>
            </div>
         </div>
         <div className="flex gap-2 w-full md:w-auto flex-wrap">
            <button 
              onClick={() => {
                setActiveVideoTab('presentation'); 
                setShowVideoModal(true);
              }}
              className="bg-white hover:bg-red-50 text-red-600 px-3 py-2 rounded-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-transform hover:scale-105 active:scale-95 text-xs whitespace-nowrap animate-pulse border-2 border-red-500"
            >
               <PlayCircle className="w-4 h-4" /> Formation X&apos;press
            </button>

            <button onClick={() => setShowHelpModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105" title="Comment jouer ?"><HelpCircle className="w-5 h-5" /></button>
            <button onClick={() => setShowDuelModal(true)} className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 text-xs md:text-sm whitespace-nowrap"><Swords className="w-4 h-4" /> Espace DR</button>
         </div>
      </div>

      <div className="w-full pb-6 md:pb-12 bg-slate-50/50 rounded-xl md:rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm overflow-hidden">
        {/* En-tête Live */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/20 bg-white/30">
          <div className="flex items-center gap-2 text-blue-900/80 font-black uppercase tracking-widest text-[10px] md:text-xs">
            <CalendarClock className="w-4 h-4 text-red-600" />
            <span className="truncate">Jour {daysElapsed} / 32</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> LIVE
          </div>
        </div>

        <div className="overflow-x-auto w-full custom-scrollbar">
          {/* TERRAIN */}
          <div className="relative h-[700px] md:h-[900px] w-[2000px] md:w-[2600px] mx-2 md:mx-4 my-2 overflow-hidden shadow-2xl select-none bg-emerald-700">
            <div className="absolute top-0 left-0 right-0 h-16 bg-slate-900 opacity-90 z-0"><div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div></div>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-900 opacity-90 z-0"><div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div></div>
            <div className="absolute top-8 bottom-8 left-8 right-8 bg-green-600 border-4 border-white shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 100px, #000 100px, #000 200px)' }}></div>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/grass.png')]"></div>
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/40"></div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border-[2px] border-white/40 rounded-full"></div>
                <div className="absolute top-0 bottom-0 w-[4px] bg-yellow-400/80 z-0 transition-all duration-1000 ease-out border-x border-yellow-200" style={{ left: `${timeProgress * 93}%` }}>
                   <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 uppercase tracking-wider">Aujourd&apos;hui</div>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-[6%] bg-red-600 border-l-[6px] border-white flex items-center justify-center shadow-2xl z-0">
                   <div className="relative w-28 h-28 md:w-40 md:h-40 border-[8px] border-white bg-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] transform -rotate-90 md:rotate-0">
                      <span className="text-white font-black text-5xl md:text-6xl tracking-tighter drop-shadow-md">BUT</span>
                   </div>
                </div>
                {Array.from({ length: 15 }).map((_, i) => (
                   <div key={i} className="absolute left-0 right-0 border-b border-white/10" style={{ top: `${(i + 1) * (100 / 15)}%` }}></div>
                ))}
            </div>

            {/* OBSTACLES */}
            {OBSTACLES.map((obs, idx) => (
              <div key={idx} className="absolute top-1/2 -translate-y-1/2 z-10 group/obs cursor-help" style={{ left: `${obs.pos}%` }}>
                <div className="opacity-0 group-hover/obs:opacity-100 transition-all absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-black/90 text-white p-3 rounded-xl border border-yellow-400/50 w-48 text-center z-50 pointer-events-none transform scale-90 group-hover/obs:scale-100">
                  <h4 className="text-xs font-bold text-yellow-400 uppercase mb-1">{obs.name}</h4>
                  <p className="text-[10px] leading-tight italic">&quot;{obs.desc}&quot;</p>
                </div>
                <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: idx * 0.3 }} className="flex flex-col items-center justify-center w-32">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-900/60 backdrop-blur-md border-[3px] border-white/30 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                     <obs.icon className={`w-10 h-10 md:w-12 md:h-12 ${obs.color} drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]`} />
                  </div>
                  <div className="mt-2 bg-black/70 px-3 py-1.5 rounded-lg text-center border border-white/20 backdrop-blur-md shadow-lg transform -rotate-2">
                    <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider block whitespace-nowrap">{obs.name}</span>
                  </div>
                </motion.div>
              </div>
            ))}

            {/* JOUEURS */}
            <AnimatePresence>
              {regions.map((region, index) => {
                const rawScore = region.current_score_obj || 0;
                const safePosition = getPosition(rawScore);
                const laneHeight = 100 / (regions.length || 15);
                const verticalPercent = 2 + (index * laneHeight); 
                const isAheadOfTime = safePosition > (timeProgress * 93);
                
                const displayName = region.pseudo || region.name;
                const displayInitials = getInitials(displayName);

                return (
                  <motion.div
                    key={region.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ left: `${safePosition}%`, top: `${verticalPercent}%`, opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 30, damping: 20 }}
                    onClick={() => setSelectedRegion(region)}
                    className="absolute z-20 cursor-pointer group touch-manipulation h-[6%]"
                  >
                    <div className="flex flex-col items-center relative w-24">
                        
                      {/* BULLE INFO */}
                      <div className="opacity-0 group-hover:opacity-100 transition-all absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-2xl z-50 flex flex-col items-center border border-slate-700 pointer-events-none min-w-[120px]">
                         <div className="flex items-center gap-1">
                           <span className="text-xs font-bold text-white mb-0.5">{displayName}</span>
                           {/* Bouton Edit (Admin) */}
                           {isAdmin && (
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleUpdatePseudo(region.id, region.pseudo || "");
                               }} 
                               className="pointer-events-auto p-1 bg-white/20 hover:bg-white/40 rounded-full"
                             >
                               <Edit2 className="w-2 h-2 text-yellow-400" />
                             </button>
                           )}
                         </div>
                         <span className="text-[10px] font-mono text-blue-300">{rawScore.toLocaleString()} pts</span>
                         <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-700"></div>
                      </div>

                      <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} className="relative flex items-center justify-center w-full">
                        <div className="absolute -left-8 opacity-60 text-white/70 text-[10px] font-mono font-bold shadow-black drop-shadow-md">#{index + 1}</div>
                          
                        {/* AVATAR AVEC INITIALES */}
                        <div className={`w-10 h-10 rounded-full border-[3px] shadow-[0_4px_15px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden bg-gradient-to-br z-10 
                          ${isAheadOfTime ? 'from-yellow-400 via-orange-500 to-red-600 border-white ring-4 ring-yellow-400/40' : 'from-blue-500 to-blue-900 border-slate-200'}
                        `}>
                           {isAheadOfTime ? <Flame className="text-white w-5 h-5 drop-shadow-md animate-pulse" /> : <span className="text-[10px] font-black text-white tracking-tighter">{displayInitials}</span>}
                        </div>
                          
                        {/* ETIQUETTE NOM */}
                        <div className="absolute top-full mt-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 w-32 text-center shadow-lg">
                          <span className="text-[9px] font-bold text-white uppercase block truncate">{displayName}</span>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </>
  );
}