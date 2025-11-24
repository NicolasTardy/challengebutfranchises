'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, TrendingUp, TrendingDown, Store } from 'lucide-react';

interface StoreData {
  id: string;
  name: string;
  percent_obj: number;
  percent_prog: number;
  ca_n: number;
}

interface ModalProps {
  regionName: string; // Le nom de la région cliquée
  onClose: () => void; // Fonction pour fermer la fenêtre
}

export default function StoreListModal({ regionName, onClose }: ModalProps) {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      // On récupère tous les documents de type "store"
      // Note : Dans une version future, on filtrera précisément par régionId
      const q = query(collection(db, "daily_stats"), where("type", "==", "store"));
      const querySnapshot = await getDocs(q);
      
      const storesList: StoreData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        storesList.push({
          id: doc.id,
          name: data.name,
          percent_obj: data.percent_obj,
          percent_prog: data.percent_prog,
          ca_n: data.ca_n
        });
      });

      // On trie par % Objectif décroissant (les meilleurs en haut)
      storesList.sort((a, b) => b.percent_obj - a.percent_obj);
      setStores(storesList);
      setLoading(false);
    };

    fetchStores();
  }, [regionName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
        
        {/* En-tête de la Modale */}
        <div className="bg-blue-900 p-6 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Détail des Magasins</h2>
              <p className="text-blue-200 text-sm">Focus : {regionName}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Corps avec le tableau (défilable) */}
        <div className="overflow-y-auto p-6 bg-slate-50 flex-1">
          {loading ? (
            <div className="text-center py-10 text-slate-500">Chargement des scores...</div>
          ) : (
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Magasin</th>
                  <th className="px-4 py-3 text-right">Réalisé (N)</th>
                  <th className="px-4 py-3 text-center">Progression N-1</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">% Objectif</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store, index) => (
                  <tr key={store.id} className="bg-white border-b hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-6">#{index + 1}</span>
                      {store.name}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(store.ca_n)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${store.percent_prog >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {store.percent_prog > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {store.percent_prog}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-bold ${store.percent_obj >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                          {store.percent_obj}%
                        </span>
                        {/* Barre de progression mini */}
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${store.percent_obj >= 100 ? 'bg-green-500' : 'bg-orange-400'}`} 
                            style={{ width: `${Math.min(store.percent_obj, 100)}%` }}
                          ></div>
                        </div>
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
  );
}