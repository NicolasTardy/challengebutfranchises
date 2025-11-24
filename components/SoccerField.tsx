'use client';

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ShieldAlert, Trophy, Flame, Sparkles, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import StoreListModal from './StoreListModal';

// --- CONFIGURATION DES 15 PROBLÈMES ---
const OBSTACLES = [
  { name: "Inflation", pos: 10, intensity: "low" },
  { name: "Morosité", pos: 18, intensity: "med" },
  { name: "Pénurie", pos: 25, intensity: "high" },
  { name: "Concurrence Web", pos: 32, intensity: "high" },
  { name: "Baisse Fréq.", pos: 38, intensity: "med" },
  { name: "Turnover", pos: 45, intensity: "low" },
  { name: "Refus Crédit", pos: 52, intensity: "high" },
  { name: "Météo", pos: 58, intensity: "low" },
  { name: "Bug Info", pos: 64, intensity: "med" },
  { name: "Manque Formation", pos: 70, intensity: "med" },
  { name: "Retard Livraison", pos: 76, intensity: "high" },
  { name: "Hausse Charges", pos: 82, intensity: "high" },
  { name: "Pessimisme", pos: 88, intensity: "low" },
  { name: "Travaux", pos: 92, intensity: "med" },
  { name: "Résistance", pos: 96, intensity: "high" },
];

interface RegionData {
  id: string;
  name: string;
  current_score_obj: number;
}

export default function SoccerField() {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "regions"), (snapshot) => {
      const regionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RegionData[];
      setRegions(regionsList);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      {/* MODALE DÉTAIL */}
      {selectedRegion && (
        <StoreListModal regionName={selectedRegion.name} onClose={() => setSelectedRegion(null)} />
      )}

      {/* --- CONTAINER PRINCIPAL --- */}
      <div className="w-full pb-6 md:pb-12 bg-slate-50/50 rounded-xl md:rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm overflow-hidden">
        
        {/* En-tête avec NOUVEAU NOM */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/20 bg-white/30">
          <div className="flex items-center gap-2 text-blue-900/80 font-black uppercase tracking-widest text-[10px] md:text-xs">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Le match en direct - BUT plus fort ensemble !
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 animate-pulse md:hidden">
            Scroll <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* --- ZONE DE SCROLL HORIZONTAL --- */}
        <div className="overflow-x-auto w-full custom-scrollbar">
          
          {/* LE TERRAIN DE JEU */}
          <div className="relative h-[380px] md:h-[550px] w-[1800px] md:w-[2200px] mx-2 md:mx-4 my-2 rounded-lg md:rounded-xl overflow-hidden shadow-inner select-none border-2 md:border-4 border-white/40 bg-green-600">
            
            {/* --- COUCHE 1 : PELOUSE --- */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 opacity-20" 
                   style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 50px, #000 50px, #000 100px)' }}>
              </div>
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/grass.png')]"></div>
            </div>

            {/* --- COUCHE 2 : MARQUAGES AU SOL --- */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/60 blur-[1px]"></div>
            
            {/* ROND CENTRAL AVEC LOGO WATERMARK */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] md:w-[200px] md:h-[200px] border-2 md:border-4 border-white/20 rounded-full flex items-center justify-center">
               <div className="relative w-2/3 h-2/3 opacity-10 mix-blend-overlay grayscale filter blur-[1px]">
                  <Image src="/BUT.png" alt="Watermark BUT" fill className="object-contain" />
               </div>
            </div>
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20"></div>
            
            {/* Lignes de distance */}
            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(line => (
              <div key={line} className="absolute top-0 bottom-0 w-[1px] bg-white/10 border-r border-dotted border-white/30" style={{ left: `${line}%` }}>
                <span className="text-white/30 font-black text-2xl md:text-5xl absolute bottom-2 left-2 italic">{line}m</span>
              </div>
            ))}

            {/* ZONE DE BUT AVEC LE LOGO OFFICIEL */}
            <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-red-900/80 to-transparent flex items-center justify-center overflow-hidden border-l-2 border-red-500/50">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
               <motion.div 
                 animate={{ scale: [1, 1.05, 1] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                 className="rotate-90 relative w-28 h-14 md:w-48 md:h-24 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
               >
                 <Image src="/BUT.png" alt="Logo BUT Goal" fill className="object-contain" />
               </motion.div>
            </div>

            {/* --- COUCHE 3 : LES OBSTACLES (ANIMÉS) --- */}
            {OBSTACLES.map((obs, idx) => (
              <div key={idx} className="absolute top-1/2 -translate-y-1/2 z-10" style={{ left: `${obs.pos}%` }}>
                <motion.div 
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 2 + (idx % 3), repeat: Infinity, ease: "easeInOut", delay: idx * 0.1 }}
                  className="relative flex flex-col items-center justify-center w-16 md:w-24 group"
                >
                  <div className={`w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-2xl rotate-45 flex items-center justify-center shadow-lg border-2 md:border-4 
                    ${obs.intensity === 'high' ? 'bg-red-800 border-red-500 shadow-red-900/50' : obs.intensity === 'med' ? 'bg-orange-800 border-orange-500' : 'bg-slate-800 border-slate-500'}
                  `}>
                     <div className="-rotate-45">
                       {obs.intensity === 'high' ? <Flame className="text-red-200 w-5 h-5 md:w-8 md:h-8 animate-pulse" /> : <ShieldAlert className="text-white/80 w-5 h-5 md:w-8 md:h-8" />}
                     </div>
                  </div>
                  <motion.div 
                    animate={{ scale: [1, 0.6, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2 + (idx % 3), repeat: Infinity, ease: "easeInOut", delay: idx * 0.1 }}
                    className="absolute -bottom-6 w-8 h-2 bg-black/40 blur-sm rounded-full"
                  />
                  <span className="mt-4 md:mt-6 text-[8px] md:text-[10px] font-bold text-white uppercase tracking-wider bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-md border border-white/10 whitespace-nowrap">
                    {obs.name}
                  </span>
                </motion.div>
              </div>
            ))}

            {/* --- COUCHE 4 : LES JOUEURS / RÉGIONS --- */}
            <AnimatePresence>
              {regions.map((region, index) => {
                const rawScore = region.current_score_obj || 0;
                const position = Math.min(Math.max(rawScore, 0), 96);
                const laneIndex = index % 5; 
                const verticalPercent = 15 + (laneIndex * 16);
                const isLeader = rawScore > 100;

                return (
                  <motion.div
                    key={region.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ left: `${position}%`, top: `${verticalPercent}%`, opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    onClick={() => setSelectedRegion(region)}
                    className="absolute z-20 cursor-pointer group touch-manipulation"
                    style={{ marginLeft: '-20px', marginTop: '-20px' }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 md:-top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 md:px-3 md:py-2 rounded-lg shadow-xl z-50 flex flex-col items-center border border-slate-700 pointer-events-none">
                      <span className="text-blue-300 text-[8px] md:text-[10px] uppercase font-bold whitespace-nowrap">{region.name}</span>
                      <span className="text-xs md:text-lg font-bold">{rawScore.toFixed(1)}%</span>
                    </div>
                    <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }} className="relative flex flex-col items-center">
                      <div className={`w-10 h-10 md:w-16 md:h-16 rounded-full border-[2px] md:border-[3px] shadow-lg flex items-center justify-center overflow-hidden bg-gradient-to-br 
                        ${isLeader ? 'from-yellow-300 via-yellow-500 to-yellow-700 border-white ring-2 ring-yellow-400/50' : 'from-blue-400 via-blue-600 to-blue-900 border-white'}
                      `}>
                         {isLeader ? <Trophy className="text-white w-5 h-5 md:w-8 md:h-8 drop-shadow-md" /> : <User className="text-white w-5 h-5 md:w-8 md:h-8 drop-shadow-md" />}
                      </div>
                      <div className="mt-1 md:mt-2 bg-white/90 px-1.5 py-0.5 rounded-full shadow-sm border border-slate-200 flex items-center gap-1 max-w-[80px] md:max-w-none overflow-hidden">
                        {isLeader && <Sparkles className="w-2 h-2 md:w-3 md:h-3 text-yellow-500 fill-yellow-500" />}
                        <span className="text-[8px] md:text-[10px] font-black text-slate-800 uppercase tracking-tight truncate block w-full text-center">{region.name}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

          </div>
        </div>
        
        {/* LÉGENDE MOBILE */}
        <div className="flex md:hidden justify-center gap-4 mt-2 text-[10px] text-slate-500">
           <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-600 rounded-full"></div> En course</span>
           <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> &gt;100% (BUT!)</span>
        </div>

      </div>
    </>
  );
}