'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { Upload, FileUp, Loader2, CheckCircle, AlertTriangle, Eye } from 'lucide-react';

export default function AdminUpload() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', msg: string }>({ type: 'idle', msg: '' });
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus({ type: 'idle', msg: '' });
    setFilePreview(null);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      encoding: "ISO-8859-1", 
      complete: async (results) => {
        try {
          const preview = results.data.slice(0, 5).map(row => (row as string[]).join(' | ')).join('\n');
          setFilePreview(preview);
          await processData(results.data as string[][]);
          setLoading(false);
          setStatus({ type: 'success', msg: 'Données mises à jour avec succès !' });
        } catch (error: any) {
          console.error("❌ Erreur :", error);
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

  const processData = async (rows: string[][]) => {
    let headerRowIndex = -1;
    const colMap: any = {
      region: 0, // A
      store: 1,  // B
    };
    
    // Nettoyage de chaine
    const cleanStr = (str: string) => str?.toString().toUpperCase()
      .replace(/\u00A0/g, ' ')
      .replace(/[ÃÀÁÂÃÄÅ]/g, 'A')
      .replace(/[Ç]/g, 'C')
      .replace(/[ÈÉÊË]/g, 'E')
      .trim() || "";

    const cleanNum = (val: string) => {
      if (!val) return 0;
      const clean = val.toString().replace(/\s/g, '').replace(/\u00A0/g, '').replace(',', '.').replace('%', '').replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    console.log(`🔍 Analyse de ${rows.length} lignes...`);

    // 1. RECHERCHE EN-TÊTE
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const rowStr = rows[i].map(c => cleanStr(c)).join(';');
      
      // On cherche les mots clés TRC / GLD / OBJECTIF
      if (rowStr.includes('TRC') || rowStr.includes('GLD') || rowStr.includes('OBJECTIF')) {
        headerRowIndex = i;
        rows[i].forEach((colRaw, index) => {
          const name = cleanStr(colRaw);
          // Mapping dynamique des colonnes de données (à partir de C)
          if (name.includes('TRC') && (name.includes('OBJ') || name.includes('BUT'))) colMap.trc_obj = index;
          if (name.includes('TRC') && (name.includes('REAL') || name.includes('FAIT'))) colMap.trc_real = index;
          if (name.includes('GLD') && name.includes('MEN') && (name.includes('OBJ') || name.includes('BUT'))) colMap.gld_men_obj = index;
          if (name.includes('GLD') && name.includes('MEN') && (name.includes('REAL') || name.includes('FAIT'))) colMap.gld_men_real = index;
          if (name.includes('GLD') && name.includes('MEU') && (name.includes('OBJ') || name.includes('BUT'))) colMap.gld_meu_obj = index;
          if (name.includes('GLD') && name.includes('MEU') && (name.includes('REAL') || name.includes('FAIT'))) colMap.gld_meu_real = index;
        });
        break;
      }
    }

    if (headerRowIndex === -1) throw new Error("Impossible de trouver la ligne des titres (TRC, GLD...).");

    console.log("Mapping :", colMap);

    // 2. TRAITEMENT AVEC FILL-DOWN (Région mémorisée)
    const batch = writeBatch(db);
    const todayStr = new Date().toISOString().split('T')[0];
    const regionAggregator: Record<string, any> = {};
    
    let currentRegion = "INDÉFINI"; // On garde en mémoire la dernière région vue
    let count = 0;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      
      let regionName = cleanStr(row[0]);
      let storeName = cleanStr(row[1]);

      // --- LOGIQUE FILL-DOWN ---
      // Si la case Région est remplie, on met à jour la région courante
      if (regionName && regionName.length > 2) {
        currentRegion = regionName;
      } else {
        // Sinon, on utilise la région mémorisée (celle de la ligne du dessus)
        regionName = currentRegion;
      }

      // Nettoyage nom magasin
      if (!storeName || storeName.length < 3) continue;
      // On ignore si c'est une ligne de total ou si le nom du magasin = nom de la région
      if (storeName === regionName || storeName === "TOTAL") continue;

      // Récupération valeurs
      const trc_obj = colMap.trc_obj ? cleanNum(row[colMap.trc_obj]) : 0;
      const trc_real = colMap.trc_real ? cleanNum(row[colMap.trc_real]) : 0;
      const gld_men_obj = colMap.gld_men_obj ? cleanNum(row[colMap.gld_men_obj]) : 0;
      const gld_men_real = colMap.gld_men_real ? cleanNum(row[colMap.gld_men_real]) : 0;
      const gld_meu_obj = colMap.gld_meu_obj ? cleanNum(row[colMap.gld_meu_obj]) : 0;
      const gld_meu_real = colMap.gld_meu_real ? cleanNum(row[colMap.gld_meu_real]) : 0;

      // Calcul Score Global (Moyenne des % d'atteinte)
      let scoreSum = 0;
      let scoreCount = 0;

      if (trc_obj > 0) { scoreSum += (trc_real / trc_obj) * 100; scoreCount++; }
      if (gld_men_obj > 0) { scoreSum += (gld_men_real / gld_men_obj) * 100; scoreCount++; }
      if (gld_meu_obj > 0) { scoreSum += (gld_meu_real / gld_meu_obj) * 100; scoreCount++; }

      const globalPercent = scoreCount > 0 ? (scoreSum / scoreCount) : 0;
      const storeId = storeName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // On écrit dans la base en utilisant 'currentRegion' qui est maintenant fiable
      const statsRef = doc(collection(db, "daily_stats"), `${todayStr}_${storeId}`);
      batch.set(statsRef, {
        date: todayStr, name: storeName, region: currentRegion, type: 'store',
        percent_obj: parseFloat(globalPercent.toFixed(2)),
        details: { trc: trc_real, trc_obj, gld_men: gld_men_real, gld_men_obj, gld_meu: gld_meu_real, gld_meu_obj },
        last_updated: Timestamp.now()
      });

      // Agrégation Région
      if (!regionAggregator[currentRegion]) {
        regionAggregator[currentRegion] = { 
          trc_n: 0, trc_obj: 0, men_n: 0, men_obj: 0, meu_n: 0, meu_obj: 0, count: 0 
        };
      }
      const agg = regionAggregator[currentRegion];
      agg.trc_n += trc_real; agg.trc_obj += trc_obj;
      agg.men_n += gld_men_real; agg.men_obj += gld_men_obj;
      agg.meu_n += gld_meu_real; agg.meu_obj += gld_meu_obj;
      agg.count++;
      
      count++;
    }

    // Sauvegarde Régions
    for (const [rName, data] of Object.entries(regionAggregator)) {
      let rScoreSum = 0;
      let rScoreCount = 0;

      if (data.trc_obj > 0) { rScoreSum += (data.trc_n / data.trc_obj) * 100; rScoreCount++; }
      if (data.men_obj > 0) { rScoreSum += (data.men_n / data.men_obj) * 100; rScoreCount++; }
      if (data.meu_obj > 0) { rScoreSum += (data.meu_n / data.meu_obj) * 100; rScoreCount++; }

      const finalScore = rScoreCount > 0 ? (rScoreSum / rScoreCount) : 0;
      const regionId = rName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      batch.set(doc(collection(db, "regions"), regionId), {
        name: rName, 
        current_score_obj: parseFloat(finalScore.toFixed(2)),
        nb_stores: data.count, 
        last_update: todayStr
      }, { merge: true });
    }

    await batch.commit();
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-600" />
        Mise à jour (Force Colonnes A/B + Fill-Down)
      </h2>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-100 border-dashed rounded-lg cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <FileUp className="w-8 h-8 mb-3 text-blue-400" />
            <p className="mb-2 text-sm text-gray-500 font-medium">Uploader CSV</p>
          </div>
          <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={loading} />
        </label>

        {loading && <div className="text-center text-blue-600"><Loader2 className="animate-spin inline mr-2"/> Traitement...</div>}
        
        {filePreview && (
          <div className="bg-slate-900 text-slate-200 p-3 rounded text-[10px] font-mono overflow-x-auto border border-slate-700">
            <pre className="whitespace-pre-wrap">{filePreview}</pre>
          </div>
        )}

        {status.type === 'error' && (
          <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div><strong className="block mb-1">Erreur :</strong>{status.msg}</div>
          </div>
        )}

        {status.type === 'success' && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded border border-green-200">
            <CheckCircle className="w-5 h-5" /> {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}