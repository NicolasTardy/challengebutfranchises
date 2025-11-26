'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Store, Trophy, Sparkles, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface StoreData {
  id: string;
  name: string;
  percent_obj: number;
  details: {
    trc: number;
    trc_obj: number;
    gld_men: number;
    gld_men_obj: number;
    gld_meu: number;
    gld_meu_obj: number;
  };
}

interface ModalProps {
  regionName: string;
  onClose: () => void;
}

export default function StoreListModal({ regionName, onClose }: ModalProps) {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      const q = query(collection(db, "daily_stats"), where("region", "==", regionName));
      const querySnapshot = await getDocs(q);
      
      const storesList: StoreData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'store') {
          storesList.push({
            id: doc.id,
            name: data.name,
            percent_obj: data.percent_obj || 0,
            details: data.details || { trc: 0, trc_obj: 0, gld_men: 0, gld_men_obj: 0, gld_meu: 0, gld_meu_obj: 0 }
          });
        }
      });

      // Tri par score décroissant
      storesList.sort((a, b) => b.percent_obj - a.percent_obj);
      setStores(storesList);
      setLoading(false);
    };

    fetchStores();
  }, [regionName]);

  const calcPct = (real: number, obj: number) => obj > 0 ? ((real / obj) * 100).toFixed(1) : "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden border border-white/20">
        
        {/* EN-TÊTE */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-4 md:p-6 flex items-center justify-between text-white shrink-0 shadow-lg z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
              <Store className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Championnat Local</h2>
              <p className="text-blue-200 text-sm font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Région {regionName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all hover:rotate-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          
          {/* --- 1. LE MINI TERRAIN DES MAGASINS --- */}
          {!loading && stores.length > 0 && (
            <div className="p-4 bg-slate-200/50 border-b border-slate-300">
              <div className="mb-2 flex items-center justify-between">
                 <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                   <Trophy className="w-4 h-4 text-yellow-600" /> La course en direct
                 </h3>
                 <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded-full shadow-sm">Objectif 100%</span>
              </div>

              {/* STADE */}
              <div className="relative h-[300px] w-full rounded-xl overflow-hidden shadow-inner bg-emerald-600 border-2 border-slate-300 select-none">
                
                {/* Décor Pelouse */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, #000 40px, #000 80px)' }}></div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/grass.png')]"></div>
                
                {/* Lignes de distance */}
                {[25, 50, 75, 100].map(line => (
                   <div key={line} className="absolute top-0 bottom-0 w-[1px] bg-white/30 border-r border-dashed border-white/20" style={{ left: `${(line/120)*100}%` }}>
                     <span className="absolute bottom-1 left-1 text-[10px] text-white/60 font-bold">{line}%</span>
                   </div>
                ))}
                
                {/* Ligne d'Arrivée (100%) */}
                <div className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-yellow-400/30 to-transparent border-l-2 border-yellow-400/50" style={{ left: `${(100/120)*100}%` }}>
                   <div className="absolute top-2 left-1 text-[8px] font-black text-yellow-200 rotate-90 origin-left">OBJECTIF</div>
                </div>

                {/* LES MAGASINS (JOUEURS) */}
                {stores.map((store, index) => {
                  // Echelle : 120% max pour voir ceux qui dépassent
                  const rawPos = (store.percent_obj / 120) * 100; 
                  const position = Math.min(Math.max(rawPos, 2), 96);
                  
                  // Couloirs verticaux (modulo pour éviter superposition)
                  // On répartit sur 10 à 90% de la hauteur
                  const lane = index % 8; 
                  const topPos = 10 + (lane * 10); 
                  const isLeader = store.percent_obj >= 100;

                  return (
                    <motion.div
                      key={store.id}
                      initial={{ left: 0, opacity: 0 }}
                      animate={{ left: `${position}%`, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 60, delay: index * 0.05 }}
                      className="absolute z-10 group"
                      style={{ top: `${topPos}%` }}
                    >
                      <div className="relative -ml-3 flex flex-col items-center">
                        
                        {/* Bulle info au survol */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-slate-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none transition-opacity">
                          {store.name} : {store.percent_obj.toFixed(1)}%
                        </div>

                        {/* Avatar Magasin */}
                        <div className={`w-6 h-6 rounded-full shadow-md border flex items-center justify-center text-[8px] font-black
                          ${isLeader ? 'bg-yellow-400 border-white text-yellow-900 ring-2 ring-yellow-400/50' : 'bg-white border-slate-200 text-slate-700'}
                        `}>
                           {index + 1}
                        </div>
                        
                        {/* Nom court */}
                        <div className="mt-0.5 bg-black/30 px-1 rounded-sm backdrop-blur-sm max-w-[80px] truncate">
                           <span className="text-[6px] text-white font-bold block">{store.name.replace('BUT ', '')}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}


          {/* --- 2. LE TABLEAU DÉTAILLÉ (En dessous) --- */}
          <div className="p-0">
            {loading ? (
              <div className="text-center py-20 text-slate-500 flex flex-col items-center">
                 <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                 Chargement des scores...
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-20 text-slate-500">Aucune donnée pour cette région.</div>
            ) : (
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-[10px] md:text-xs text-slate-500 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 pl-8">Magasin</th>
                    <th className="px-2 py-3 text-center bg-blue-50/50 text-blue-800">Score Global</th>
                    <th className="px-2 py-3 text-center border-l border-slate-200">TRC <span className="hidden md:inline text-[9px] lowercase opacity-50">(Réal/Obj)</span></th>
                    <th className="px-2 py-3 text-center border-l border-slate-200">GLD Mén <span className="hidden md:inline text-[9px] lowercase opacity-50">(Réal/Obj)</span></th>
                    <th className="px-2 py-3 text-center border-l border-slate-200">GLD Meu <span className="hidden md:inline text-[9px] lowercase opacity-50">(Réal/Obj)</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stores.map((store, index) => (
                    <tr key={store.id} className="bg-white hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-3">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${index < 3 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-slate-100 text-slate-400'}`}>
                          {index + 1}
                        </span>
                        <span className="group-hover:text-blue-700 transition-colors">{store.name}</span>
                        {store.percent_obj >= 100 && <Sparkles className="w-3 h-3 text-yellow-500" />}
                      </td>
                      
                      {/* SCORE GLOBAL */}
                      <td className="px-2 py-3 text-center bg-blue-50/30">
                        <div className={`inline-block px-2 py-1 rounded font-black ${store.percent_obj >= 100 ? 'bg-green-100 text-green-700' : 'text-blue-900'}`}>
                          {store.percent_obj.toFixed(1)}%
                        </div>
                      </td>

                      {/* TRC */}
                      <td className="px-2 py-3 text-center border-l border-slate-100">
                        <div className="flex flex-col items-center">
                          <span className={`font-bold ${store.details.trc >= store.details.trc_obj ? 'text-green-600' : 'text-orange-500'}`}>
                            {calcPct(store.details.trc, store.details.trc_obj)}%
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">{store.details.trc.toFixed(1)}/{store.details.trc_obj.toFixed(1)}</span>
                        </div>
                      </td>

                      {/* GLD MEN */}
                      <td className="px-2 py-3 text-center border-l border-slate-100">
                        <div className="flex flex-col items-center">
                          <span className={`font-bold ${store.details.gld_men >= store.details.gld_men_obj ? 'text-green-600' : 'text-orange-500'}`}>
                            {calcPct(store.details.gld_men, store.details.gld_men_obj)}%
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">{store.details.gld_men.toFixed(0)}/{store.details.gld_men_obj.toFixed(0)}</span>
                        </div>
                      </td>

                      {/* GLD MEU */}
                      <td className="px-2 py-3 text-center border-l border-slate-100">
                        <div className="flex flex-col items-center">
                          <span className={`font-bold ${store.details.gld_meu >= store.details.gld_meu_obj ? 'text-green-600' : 'text-orange-500'}`}>
                            {calcPct(store.details.gld_meu, store.details.gld_meu_obj)}%
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">{store.details.gld_meu.toFixed(0)}/{store.details.gld_meu_obj.toFixed(0)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}