'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { Upload, FileUp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminUpload() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', msg: string }>({ type: 'idle', msg: '' });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus({ type: 'idle', msg: '' });

    // Configuration pour lire le fichier, même s'il vient d'un Excel français (ISO-8859-1)
    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy', // Force à sauter toutes les lignes vides
      encoding: "ISO-8859-1",   // Aide pour les accents français
      complete: async (results) => {
        try {
          console.log("📊 Fichier brut lu (5 premières lignes) :", results.data.slice(0, 5));
          await processData(results.data as string[][]);
          setLoading(false);
          setStatus({ type: 'success', msg: 'Mise à jour du terrain réussie ! ⚽️' });
        } catch (error: any) {
          console.error("❌ Erreur de traitement :", error);
          setLoading(false);
          setStatus({ type: 'error', msg: error.message || "Erreur inconnue" });
        }
      },
      error: (error) => {
        console.error("Erreur PapaParse:", error);
        setLoading(false);
        setStatus({ type: 'error', msg: "Erreur de lecture du fichier CSV." });
      }
    });
  };

  const processData = async (rows: string[][]) => {
    // 1. Trouver la ligne d'en-tête
    let headerRowIndex = -1;
    const colMap: any = {};

    console.log(`🔍 Recherche des colonnes dans ${rows.length} lignes...`);

    // On cherche dans les 30 premières lignes
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      // On convertit toute la ligne en une seule chaine pour chercher les mots clés
      const rowString = JSON.stringify(row).toUpperCase();
      
      // On cherche "CA N" et "BUDGET" (insensible à la casse)
      if (rowString.includes('CA N') && rowString.includes('BUDGET')) {
        headerRowIndex = i;
        console.log("✅ Ligne d'en-tête trouvée à l'index :", i);
        
        // MAPPING DES COLONNES
        row.forEach((colName, index) => {
          if (!colName) return;
          const cleanName = colName.toString().trim().toUpperCase();
          
          if (cleanName === 'CA N') colMap.ca_n = index;
          if (cleanName === 'CA N-1') colMap.ca_n1 = index;
          if (cleanName === 'BUDGET') colMap.budget = index;
        });
        break;
      }
    }

    // Vérification précise pour dire à l'utilisateur ce qui manque
    if (headerRowIndex === -1) throw new Error("Impossible de trouver la ligne contenant 'CA N' et 'Budget'.");
    if (colMap.ca_n === undefined) throw new Error("Colonne 'CA N' introuvable.");
    if (colMap.budget === undefined) throw new Error("Colonne 'Budget' introuvable.");

    console.log("🗺 Mapping des colonnes :", colMap);

    // 2. Préparer le Batch
    const batch = writeBatch(db);
    const todayStr = new Date().toISOString().split('T')[0];
    
    let countStores = 0;
    let countRegions = 0;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[0]?.toString().trim(); // Nom en première colonne ?

      // On ignore les lignes vides ou bizarres
      if (!name || name === "TOTAL" || name.includes("Regions et magasins") || name.length < 3) continue;

      // Nettoyage des valeurs (gestion des espaces insécables et des virgules)
      const parseValue = (val: string) => {
        if (!val) return 0;
        // Remplace les espaces, remplace virgule par point
        const cleaned = val.toString().replace(/\s/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      const ca_n = parseValue(row[colMap.ca_n]);
      const ca_n1 = parseValue(row[colMap.ca_n1]);
      const budget = parseValue(row[colMap.budget]);

      // Si pas de budget, on évite la division par zéro
      const percent_obj = budget > 0 ? (ca_n / budget) * 100 : 0;
      const percent_prog = ca_n1 > 0 ? ((ca_n - ca_n1) / ca_n1) * 100 : 0;

      // Détection Type
      const isStore = name.toUpperCase().startsWith("BUT ");
      const type = isStore ? 'store' : 'region';
      const docId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

      if (isStore) countStores++; else countRegions++;

      // Ajout Stats Journalières
      const statsRef = doc(collection(db, "daily_stats"), `${todayStr}_${docId}`);
      batch.set(statsRef, {
        date: todayStr,
        name: name,
        type: type,
        ca_n,
        ca_n1,
        budget,
        percent_obj: parseFloat(percent_obj.toFixed(2)),
        percent_prog: parseFloat(percent_prog.toFixed(2)),
        last_updated: Timestamp.now()
      });

      // Mise à jour Collection Régions (pour le terrain)
      if (type === 'region') {
        const regionRef = doc(collection(db, "regions"), docId);
        batch.set(regionRef, {
          name: name,
          current_score_obj: parseFloat(percent_obj.toFixed(2)),
          current_score_prog: parseFloat(percent_prog.toFixed(2)),
          last_update: todayStr
        }, { merge: true });
      }
    }

    console.log(`📤 Envoi de ${countStores} magasins et ${countRegions} régions vers Firebase...`);
    await batch.commit();
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-600" />
        Mise à jour Quotidienne
      </h2>
      
      <div className="flex flex-col gap-4">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <FileUp className="w-8 h-8 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Uploader le CSV</span></p>
          </div>
          <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={loading} />
        </label>

        {loading && (
          <div className="flex items-center gap-2 text-blue-600 font-medium justify-center">
            <Loader2 className="animate-spin w-5 h-5" />
            Analyse en cours...
          </div>
        )}

        {status.type === 'error' && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
             <strong>Erreur :</strong> {status.msg}
             <p className="mt-1 text-xs text-red-500">Ouvre la console (F12) pour voir les détails techniques.</p>
          </div>
        )}

        {status.type === 'success' && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded border border-green-200">
             ✅ {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}