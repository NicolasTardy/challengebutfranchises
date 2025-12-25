'use client';

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp, getDocs, query, updateDoc, onSnapshot, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { Upload, FileUp, Loader2, CheckCircle, AlertTriangle, Eye, Trash2, Edit2, Save, X, MessageCircle, ShieldAlert } from 'lucide-react';

// CORRECTION ICI : "pseudo" au lieu de "nickname"
interface Region {
  id: string;
  name: string;
  pseudo?: string; 
}

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  createdAt: any;
  region?: string;
}

export default function AdminUpload() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', msg: string }>({ type: 'idle', msg: '' });
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  // États Pseudos
  const [regions, setRegions] = useState<Region[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  // États Modération Chat
  const [drMessages, setDrMessages] = useState<ChatMessage[]>([]);
  const [storeMessages, setStoreMessages] = useState<ChatMessage[]>([]);

  // 1. Charger les Régions
  useEffect(() => {
    fetchRegions();
  }, []);

  // 2. Charger les Messages en temps réel (pour modération)
  useEffect(() => {
    // Tchat DR
    const qDr = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(20));
    const unsubDr = onSnapshot(qDr, (snap) => {
      setDrMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    });

    // Tchat Magasins
    const qStore = query(collection(db, "store_messages"), orderBy("createdAt", "desc"), limit(20));
    const unsubStore = onSnapshot(qStore, (snap) => {
      setStoreMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    });

    return () => { unsubDr(); unsubStore(); };
  }, []);

  // --- LOGIQUE RÉGIONS ---
  const fetchRegions = async () => {
    const q = query(collection(db, "regions"));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region));
    list.sort((a, b) => a.name.localeCompare(b.name));
    setRegions(list);
  };

  // CORRECTION ICI : On met à jour le champ 'pseudo'
  const handleUpdatePseudo = async (id: string) => {
    try {
      await updateDoc(doc(db, "regions", id), {
        pseudo: tempName.trim() === "" ? null : tempName
      });
      setEditingId(null);
      fetchRegions();
    } catch (e) { console.error(e); }
  };

  // --- LOGIQUE MODÉRATION ---
  const deleteMessage = async (collectionName: string, id: string) => {
    if(!confirm("Supprimer ce message ?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) { console.error(e); }
  };

  const clearAllChat = async (collectionName: string) => {
    if(!confirm("⚠️ ATTENTION : Cela va effacer TOUT l'historique de ce tchat. Continuer ?")) return;
    const q = query(collection(db, collectionName));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  };

  // --- LOGIQUE IMPORT CSV ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus({ type: 'idle', msg: '' });
    setFilePreview(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: "ISO-8859-1", 
      complete: async (results) => {
        try {
          const preview = results.data.slice(0, 3).map((row: any) => 
            `${row.MAGASINS || row.magasins} | ${row.REGION || row.region} | ${row.points}`
          ).join('\n');
          setFilePreview(preview);
          await clearDatabase();
          await processData(results.data);
          setLoading(false);
          setStatus({ type: 'success', msg: 'Mise à jour réussie ! 🏆' });
          fetchRegions(); 
        } catch (error: any) {
          setLoading(false);
          setStatus({ type: 'error', msg: error.message });
        }
      },
      error: () => {
        setLoading(false);
        setStatus({ type: 'error', msg: "Fichier illisible." });
      }
    });
  };

  const clearDatabase = async () => {
    const batch = writeBatch(db);
    const statsQuery = query(collection(db, "daily_stats"));
    // NOTE: On ne supprime PAS la collection 'regions' entière pour garder les pseudos,
    // mais ici tu semblais vouloir tout nettoyer.
    // Pour ne pas perdre les pseudos lors d'un reset total, il faudrait une logique plus complexe,
    // mais pour l'instant je laisse ta logique de reset si c'est ce que tu veux (attention, un clearDatabase effacera les pseudos).
    // Si tu veux juste mettre à jour les points, n'appelle pas clearDatabase sur 'regions'.
    
    // Pour sécuriser tes pseudos, je commente la suppression des régions ici.
    // Seuls les stats journalières sont effacées.
    const sSnap = await getDocs(statsQuery);
    sSnap.forEach((doc) => batch.delete(doc.ref));
    
    if (sSnap.size > 0) await batch.commit();
  };

  const processData = async (data: any[]) => {
    const batch = writeBatch(db);
    const todayStr = new Date().toISOString().split('T')[0];
    const regionAggregator: Record<string, { totalPoints: number, count: number }> = {};
    let count = 0;

    const cleanNum = (val: string) => {
      if (!val) return 0;
      const clean = val.toString().replace(/\s/g, '').replace(',', '.').replace('%', '');
      return parseFloat(clean) || 0;
    };

    data.forEach((row) => {
      const storeName = (row.MAGASINS || row.magasins || row.Libellé || "").trim();
      const regionName = (row.REGION || row.region || row.Région || "").trim();
      const rawPoints = row.points || row.POINTS || row.Points || "0";

      if (!storeName || storeName.length < 3) return; 
      if (storeName === "TOTAL" || storeName === regionName) return;
      if (!regionName) return;

      const score = cleanNum(rawPoints);
      const storeId = storeName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const statsRef = doc(collection(db, "daily_stats"), `${todayStr}_${storeId}`);
      
      batch.set(statsRef, {
        date: todayStr,
        name: storeName,
        region: regionName,
        type: 'store',
        percent_obj: parseFloat(score.toFixed(2)),
        last_updated: Timestamp.now()
      });

      if (!regionAggregator[regionName]) {
        regionAggregator[regionName] = { totalPoints: 0, count: 0 };
      }
      regionAggregator[regionName].totalPoints += score;
      regionAggregator[regionName].count += 1;
      count++;
    });

    if (count === 0) throw new Error("Aucun magasin trouvé.");

    for (const [rName, data] of Object.entries(regionAggregator)) {
      const avgScore = data.count > 0 ? (data.totalPoints / data.count) : 0;
      const regionId = rName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // ICI : merge: true permet de garder le champ 'pseudo' existant
      batch.set(doc(collection(db, "regions"), regionId), {
        name: rName, 
        current_score_obj: parseFloat(avgScore.toFixed(2)),
        nb_stores: data.count, 
        last_update: todayStr
      }, { merge: true }); 
    }
    await batch.commit();
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md border border-gray-100">
      
      {/* SECTION 1: IMPORT */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-500" /> Mise à jour Données
        </h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-blue-100 border-dashed rounded-lg cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FileUp className="w-6 h-6 mb-2 text-blue-400" />
              <p className="text-xs text-gray-500 font-medium">Glisser le fichier CSV</p>
            </div>
            <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={loading} />
          </label>
          {loading && <div className="text-center text-blue-600 animate-pulse"><Loader2 className="animate-spin inline mr-2"/> Traitement...</div>}
          {status.type === 'success' && <div className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200"><CheckCircle className="w-4 h-4 inline mr-1"/> {status.msg}</div>}
          {status.type === 'error' && <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200"><AlertTriangle className="w-4 h-4 inline mr-1"/> {status.msg}</div>}
        </div>
      </div>

      <hr className="my-6" />

      {/* SECTION 2: PSEUDOS */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-blue-600" /> Pseudos Régions
        </h2>
        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg p-2 bg-slate-50">
           {regions.map((r) => (
             <div key={r.id} className="flex items-center justify-between p-1.5 bg-white rounded shadow-sm">
               <div className="flex-1">
                 <div className="text-[10px] font-bold text-slate-400 uppercase">{r.name}</div>
                 {editingId === r.id ? (
                   <input autoFocus type="text" className="w-full text-sm border-b border-blue-500 outline-none" value={tempName} onChange={(e) => setTempName(e.target.value)} />
                 ) : (
                   // CORRECTION : Affichage du pseudo
                   <div className="text-sm font-medium text-slate-800">{r.pseudo || "-"}</div>
                 )}
               </div>
               <div className="ml-2">
                 {editingId === r.id ? (
                   <div className="flex gap-1">
                     <button onClick={() => handleUpdatePseudo(r.id)} className="p-1 text-green-600 hover:bg-green-100 rounded"><Save className="w-3 h-3"/></button>
                     <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-3 h-3"/></button>
                   </div>
                 ) : (
                   // CORRECTION : Initialisation avec pseudo
                   <button onClick={() => { setEditingId(r.id); setTempName(r.pseudo || r.name); }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3 h-3" /></button>
                 )}
               </div>
             </div>
           ))}
        </div>
      </div>

      <hr className="my-6" />

      {/* SECTION 3: MODÉRATION TCHAT */}
      <div>
        <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" /> Modération Tchats
        </h2>

        {/* Tchat DR */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
             <h3 className="text-xs font-bold text-slate-500 uppercase flex gap-1"><MessageCircle className="w-3 h-3"/> Tchat DR (Régions)</h3>
             <button onClick={() => clearAllChat('messages')} className="text-[10px] text-red-500 hover:underline">Tout vider</button>
          </div>
          <div className="bg-slate-900 rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar">
             {drMessages.length === 0 && <div className="text-slate-500 text-xs italic">Aucun message.</div>}
             {drMessages.map(m => (
               <div key={m.id} className="flex justify-between items-start gap-2 mb-2 border-b border-slate-800 pb-1">
                 <div className="text-xs text-slate-300">
                   <span className="font-bold text-blue-400">{m.sender} :</span> {m.text}
                 </div>
                 <button onClick={() => deleteMessage('messages', m.id)} className="text-slate-500 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
               </div>
             ))}
          </div>
        </div>

        {/* Tchat Magasins */}
        <div>
          <div className="flex justify-between items-center mb-2">
             <h3 className="text-xs font-bold text-slate-500 uppercase flex gap-1"><MessageCircle className="w-3 h-3"/> Tchat Magasins</h3>
             <button onClick={() => clearAllChat('store_messages')} className="text-[10px] text-red-500 hover:underline">Tout vider</button>
          </div>
          <div className="bg-slate-900 rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar">
             {storeMessages.length === 0 && <div className="text-slate-500 text-xs italic">Aucun message.</div>}
             {storeMessages.map(m => (
               <div key={m.id} className="flex justify-between items-start gap-2 mb-2 border-b border-slate-800 pb-1">
                 <div className="text-xs text-slate-300">
                   <span className="text-[9px] text-slate-500 block">{m.region}</span>
                   <span className="font-bold text-yellow-400">{m.sender} :</span> {m.text}
                 </div>
                 <button onClick={() => deleteMessage('store_messages', m.id)} className="text-slate-500 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
               </div>
             ))}
          </div>
        </div>

      </div>

    </div>
  );
}