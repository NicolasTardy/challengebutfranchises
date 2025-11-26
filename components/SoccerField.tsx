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
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0"></span>
            <span className="truncate">Le match en direct - BUT plus fort ensemble ! - Pour affronter tous les défis du quotidien.</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 animate-pulse md:hidden shrink-0">
            Scroll <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        <div className="overflow-x-auto w-full custom-scrollbar">
          
          {/* LE STADE (Dimensions) */}
          <div className="relative h-[700px] md:h-[900px] w-[1800px] md:w-[2200px] mx-2 md:mx-4 my-2 overflow-hidden shadow-2xl select-none bg-emerald-700">
            
            {/* --- 1. LES TRIBUNES (FOULE) --- */}
            {/* Tribune Haut */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-slate-900 opacity-80 z-0">
               <div className="w-full h-full bg-gradient-to-b from-black/60 to-transparent"></div>
            </div>
            {/* Tribune Bas */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-slate-900 opacity-80 z-0">
               <div className="w-full h-full bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>

            {/* --- 2. LA PELOUSE (TERRAIN OFFICIEL) --- */}
            <div className="absolute top-8 bottom-8 left-8 right-8 bg-green-600 border-4 border-white/80 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] overflow-hidden rounded-sm">
                
                {/* Texture Herbe */}
                <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/grass.png")' }}></div>
                
                {/* Bandes de tonte (Stripes) - Verticales cette fois pour faire vrai foot */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 100px, #000 100px, #000 200px)' }}></div>

                {/* --- 3. LES MARQUAGES OFFICIELS (Lignes Blanches) --- */}
                
                {/* Ligne Médiane */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/80"></div>
                
                {/* Rond Central */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border-[2px] border-white/80 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div> {/* Point central */}
                    {/* Logo Watermark Central */}
                    <div className="absolute w-3/4 h-3/4 opacity-20 mix-blend-overlay grayscale">
                        <Image src="/BUT.png" alt="Watermark BUT" fill className="object-contain" />
                    </div>
                </div>

                {/* Surface de réparation (Zone BUT - Droite) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[300px] h-[60%] border-l-[2px] border-t-[2px] border-b-[2px] border-white/80 bg-white/5">
                    {/* Point de pénalty */}
                    <div className="absolute left-[150px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                    {/* Zone de but (Petite surface) */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[100px] h-[40%] border-l-[2px] border-t-[2px] border-b-[2px] border-white/80"></div>
                    {/* Arc de cercle surface */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[100px] h-[100px] border-l-[2px] border-white/80 rounded-full clip-path-arc"></div> 
                </div>

                {/* Surface de réparation (Zone DÉPART - Gauche - Juste pour l'esthétique) */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[150px] h-[60%] border-r-[2px] border-t-[2px] border-b-[2px] border-white/40 opacity-50"></div>


                {/* COULOIRS DE COURSE (Discrets) */}
                {Array.from({ length: 15 }).map((_, i) => (
                   <div key={i} className="absolute left-0 right-0 border-b border-white/5" style={{ top: `${(i + 1) * (100 / 15)}%` }}></div>
                ))}
            </div>


            {/* --- 4. LA ZONE DE BUT (GOAL) --- */}
            {/* Le filet de but à droite */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-16 h-32 border-2 border-white/50 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-50 z-0"></div>
            
            {/* Logo BUT Vainqueur */}
            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-32 h-64 flex items-center justify-center z-10">
               <motion.div 
                 animate={{ scale: [1, 1.05, 1] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                 className="rotate-90 relative w-48 h-24 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
               >
                 <Image src="/BUT.png" alt="Logo BUT Goal" fill className="object-contain" />
               </motion.div>
            </div>


            {/* --- 5. OBSTACLES (Flottants) --- */}
            {OBSTACLES.map((obs, idx) => (
              // On ajuste la position pour qu'elle corresponde au nouveau terrain (marges de 8px)
              <div key={idx} className="absolute top-1/2 -translate-y-1/2 z-10 opacity-90" style={{ left: `${obs.pos}%` }}>
                <motion.div 
                  animate={{ y: [0, -35, 0] }}
                  transition={{ duration: 3 + (idx % 2), repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
                  className="relative flex flex-col items-center justify-center w-20 md:w-32"
                >
                  <div className={`w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-3xl rotate-45 flex items-center justify-center shadow-2xl border-2 md:border-4 
                    ${obs.intensity === 'high' ? 'bg-red-900/80 border-red-500 shadow-red-500/30' : 'bg-slate-800/80 border-slate-500'}
                  `}>
                     <div className="-rotate-45">
                       {obs.intensity === 'high' ? 
                          <Flame className="text-red-200 w-6 h-6 md:w-10 md:h-10 animate-pulse" /> : 
                          <ShieldAlert className="text-white/80 w-6 h-6 md:w-10 md:h-10" />
                       }
                     </div>
                  </div>
                  <motion.div 
                    animate={{ scale: [1, 0.5, 1], opacity: [0.6, 0.2, 0.6] }}
                    transition={{ duration: 3 + (idx % 2), repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
                    className="absolute -bottom-8 w-12 md:w-16 h-3 bg-black/50 blur-md rounded-full"
                  />
                  <span className="mt-6 text-[7px] md:text-[9px] font-bold text-white uppercase tracking-wider whitespace-nowrap bg-black/50 px-2 py-0.5 rounded backdrop-blur-md border border-white/20">
                    {obs.name}
                  </span>
                </motion.div>
              </div>
            ))}

            {/* --- 6. JOUEURS --- */}
            <AnimatePresence>
              {regions.map((region, index) => {
                const rawScore = region.current_score_obj || 0;
                // Ajustement des marges safe pour le nouveau terrain
                const safePosition = 4 + ((Math.min(Math.max(rawScore, 0), 100) / 100) * 88);
                
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
                      
                      {/* Ligne d'avancement verticale */}
                      <div className="absolute top-10 w-[2px] h-[500px] bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

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

                        <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full border-[2px] shadow-md flex items-center justify-center overflow-hidden bg-gradient-to-br z-10 
                          ${isLeader ? 'from-yellow-300 via-yellow-500 to-yellow-700 border-white ring-2 ring-yellow-400/50' : 'from-blue-500 via-blue-700 to-blue-900 border-white'}
                        `}>
                           {isLeader ? 
                             <Trophy className="text-white w-3 h-3 md:w-4 md:h-4 drop-shadow-md" /> : 
                             <span className="text-[8px] md:text-[9px] font-black text-white">{region.name.substring(0,2).toUpperCase()}</span>
                           }
                        </div>
                        
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