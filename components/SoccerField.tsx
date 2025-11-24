'use client';

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ShieldAlert, Trophy, Flame, Sparkles, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import StoreListModal from './StoreListModal';

// --- CONFIGURATION ---
const OBSTACLES = [
  { name: "Inflation", pos: 12, intensity: "low" },
  { name: "Morosité", pos: 17, intensity: "med" },
  { name: "Pénurie", pos: 22, intensity: "high" },
  { name: "Concurrence Web", pos: 27, intensity: "high" },
  { name: "Baisse Fréq.", pos: 32, intensity: "med" },
  { name: "Turnover", pos: 37, intensity: "low" },
  { name: "Refus Crédit", pos: 42, intensity: "high" },
  { name: "Météo", pos: 47, intensity: "low" },
  { name: "Bug Info", pos: 52, intensity: "med" },
  { name: "Manque Formation", pos: 57, intensity: "med" },
  { name: "Retard Livraison", pos: 62, intensity: "high" },
  { name: "Hausse Charges", pos: 67, intensity: "high" },
  { name: "Pessimisme", pos: 72, intensity: "low" },
  { name: "Travaux", pos: 77, intensity: "med" },
  { name: "Résistance", pos: 82, intensity: "high" },
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
      regionsList.sort((a, b) => a.name.localeCompare(b.name));
      setRegions(regionsList);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      {selectedRegion && (
        <StoreListModal regionName={selectedRegion.name} onClose={() => setSelectedRegion(null)} />
      )}

      <div className="w-full pb-6 md:pb-12 bg-slate-50/50 rounded-xl md:rounded-2xl shadow-xl border border-white/50 backdrop-blur-sm overflow-hidden">
        
        {/* En-tête */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/20 bg-white/30">
          <div className="flex items-center gap-2 text-blue-900/80 font-black uppercase tracking-widest text-[10px] md:text-xs">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Le match en direct - BUT plus fort ensemble !
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 animate-pulse md:hidden">
            Scroll <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        <div className="overflow-x-auto w-full custom-scrollbar">
          
          {/* LE TERRAIN */}
          <div className="relative h-[650px] md:h-[850px] w-[1800px] md:w-[2200px] mx-2 md:mx-4 my-2 rounded-lg md:rounded-xl overflow-hidden shadow-inner select-none border-2 md:border-4 border-white/40 bg-green-600">
            
            {/* --- COUCHE 1 : PELOUSE --- */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 50px, #000 50px, #000 100px)' }}></div>
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/grass.png')]"></div>
            </div>

            {/* --- COUCHE 2 : COULOIRS --- */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="absolute left-0 right-0 border-b border-white/10" style={{ top: `${(i + 1) * (100 / 15)}%` }}></div>
            ))}

            {/* --- COUCHE 3 : DÉCOR --- */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/60 blur-[1px]"></div>
            
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border-4 border-white/10 rounded-full flex items-center justify-center pointer-events-none">
               <div className="relative w-3/4 h-3/4 opacity-10 mix-blend-overlay grayscale filter blur-[1px]">
                  <Image src="/BUT.png" alt="Watermark BUT" fill className="object-contain" />
               </div>
            </div>
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20"></div>
            
            {/* Lignes de distance */}
            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(line => (
              <div key={line} className="absolute top-0 bottom-0 w-[1px] bg-white/10 border-r border-dotted border-white/30 z-0" style={{ left: `${line}%` }}>
                <span className="text-white/20 font-black text-xl md:text-3xl absolute bottom-2 left-2 italic">{line}m</span>
              </div>
            ))}

            {/* ZONE DE BUT */}
            <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-red-900/80 to-transparent flex items-center justify-center overflow-hidden border-l-2 border-red-500/50 z-10">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
               <motion.div 
                 animate={{ scale: [1, 1.05, 1] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                 className="rotate-90 relative w-28 h-14 md:w-48 md:h-24 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
               >
                 <Image src="/BUT.png" alt="Logo BUT Goal" fill className="object-contain" />
               </motion.div>
            </div>

            {/* --- COUCHE 4 : OBSTACLES --- */}
            {OBSTACLES.map((obs, idx) => (
              <div key={idx} className="absolute top-1/2 -translate-y-1/2 z-0 opacity-80" style={{ left: `${obs.pos}%` }}>
                <motion.div 
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 3 + (idx % 2), repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
                  className="relative flex flex-col items-center justify-center w-16 md:w-24"
                >
                  <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg rotate-45 flex items-center justify-center shadow-lg border-2 
                    ${obs.intensity === 'high' ? 'bg-red-900/60 border-red-500/50' : 'bg-slate-800/60 border-slate-500/50'}
                  `}>
                     <div className="-rotate-45">
                       {obs.intensity === 'high' ? <Flame className="text-red-200 w-4 h-4 md:w-6 md:h-6" /> : <ShieldAlert className="text-white/60 w-4 h-4 md:w-6 md:h-6" />}
                     </div>
                  </div>
                  {/* Police des obstacles réduite aussi */}
                  <span className="mt-4 text-[6px] md:text-[8px] font-bold text-white/70 uppercase tracking-wider whitespace-nowrap bg-black/30 px-1 rounded">
                    {obs.name}
                  </span>
                </motion.div>
              </div>
            ))}

            {/* --- COUCHE 5 : JOUEURS (RÉGIONS) --- */}
            <AnimatePresence>
              {regions.map((region, index) => {
                const rawScore = region.current_score_obj || 0;
                
                // Marge de sécurité (2% - 92%)
                const safePosition = 2 + ((Math.min(Math.max(rawScore, 0), 100) / 100) * 92);
                
                const laneHeight = 100 / (regions.length || 15);
                const verticalPercent = 2 + (index * laneHeight); 
                
                const isLeader = rawScore > 100;

                return (
                  <motion.div
                    key={region.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ left: `${safePosition}%`, top: `${verticalPercent}%`, opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 40, damping: 20 }}
                    onClick={() => setSelectedRegion(region)}
                    className="absolute z-20 cursor-pointer group touch-manipulation h-[6%]"
                    style={{ marginTop: '0px', marginLeft: '0px' }}
                  >
                    <div className="flex flex-col items-center relative w-12 md:w-24">
                      
                      <div className="absolute top-10 w-[2px] h-[500px] bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                      <div className="opacity-0 group-hover:opacity-100 transition-all absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded shadow-xl z-50 flex items-center gap-2 border border-slate-700 pointer-events-none whitespace-nowrap scale-90 group-hover:scale-100">
                         <span className="text-xs font-bold text-blue-300">{region.name}</span>
                         <span className="text-sm font-black bg-white text-slate-900 px-1 rounded">{rawScore.toFixed(1)}%</span>
                      </div>

                      <motion.div 
                        whileHover={{ scale: 1.15 }} 
                        whileTap={{ scale: 0.95 }}
                        className="relative flex items-center justify-center w-full"
                      >
                        <div className="absolute -left-6 md:-left-8 opacity-50 text-white/50 text-[8px] font-mono">
                          #{index + 1}
                        </div>

                        {/* Avatar Cercle (Taille réduite pour aérer) */}
                        <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full border-[2px] shadow-md flex items-center justify-center overflow-hidden bg-gradient-to-br z-10 
                          ${isLeader ? 'from-yellow-300 via-yellow-500 to-yellow-700 border-white ring-2 ring-yellow-400/50' : 'from-blue-500 via-blue-700 to-blue-900 border-white'}
                        `}>
                           {isLeader ? 
                             <Trophy className="text-white w-3 h-3 md:w-4 md:h-4 drop-shadow-md" /> : 
                             <span className="text-[8px] md:text-[9px] font-black text-white">{region.name.substring(0,2).toUpperCase()}</span>
                           }
                        </div>
                        
                        {/* Étiquette Nom (Taille police 5px mobile / 7px desktop - BOITE ÉLARGIE) */}
                        <div className="absolute top-full mt-1 bg-black/40 backdrop-blur-sm px-1 py-0.5 rounded-sm border border-white/10 w-28 md:w-40">
                          <span className="text-[5px] md:text-[7px] font-bold text-white uppercase tracking-tight block w-full text-center truncate leading-tight">
                            {region.name}
                          </span>
                        </div>

                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

          </div>
        </div>
        
        {/* Légende */}
        <div className="flex md:hidden justify-center gap-4 mt-2 text-[10px] text-slate-500">
           <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-600 rounded-full"></div> En course</span>
           <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> &gt;100% (BUT!)</span>
        </div>

      </div>
    </>
  );
}