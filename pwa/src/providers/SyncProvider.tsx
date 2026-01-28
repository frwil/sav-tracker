'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SyncTask } from '@/types/SyncTask';

interface SyncContextType {
  queue: SyncTask[];
  addToQueue: (task: Omit<SyncTask, 'id' | 'timestamp' | 'retryCount'>) => void;
  isSyncing: boolean;
}

const SyncContext = createContext<SyncContextType>({
  queue: [],
  addToQueue: () => {},
  isSyncing: false,
});

export const useSync = () => useContext(SyncContext);

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<SyncTask[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Charger la queue depuis le localStorage au démarrage
  useEffect(() => {
    const savedQueue = localStorage.getItem('sav_sync_queue');
    if (savedQueue) {
      setQueue(JSON.parse(savedQueue));
    }
  }, []);

  // 2. Sauvegarder la queue à chaque changement
  useEffect(() => {
    localStorage.setItem('sav_sync_queue', JSON.stringify(queue));
  }, [queue]);

  // 3. Fonction pour traiter la file d'attente (Sync)
  const processQueue = async () => {
    if (isSyncing || queue.length === 0) return;
    if (!navigator.onLine) return; // Sécurité supplémentaire

    setIsSyncing(true);
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const token = localStorage.getItem('sav_token');

    // On crée une copie de la queue pour itérer
    const currentQueue = [...queue];
    const failedTasks: SyncTask[] = [];

    for (const task of currentQueue) {
      try {
        console.log(`Tentative de sync pour : ${task.url}`);
        
        const res = await fetch(`${API_URL}${task.url}`, {
          method: task.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/ld+json',
          },
          body: JSON.stringify(task.body),
        });

        if (!res.ok) {
          // Si erreur 4xx (client) ou 5xx (serveur), on throw pour gérer le retry
          // Exception : Si 400 (Bad Request), on pourrait décider de supprimer la tâche car elle ne passera jamais
          throw new Error(`Erreur HTTP ${res.status}`);
        }

        // Si succès, on ne fait rien, la tâche ne sera pas ajoutée à failedTasks
        console.log(`Succès sync pour : ${task.id}`);

      } catch (error) {
        console.error(`Échec sync pour ${task.id}`, error);
        // On garde la tâche pour réessayer plus tard
        // On pourrait augmenter un compteur retryCount ici
        failedTasks.push({ ...task, retryCount: task.retryCount + 1 });
      }
    }

    // On met à jour la queue avec seulement les tâches qui ont échoué
    setQueue(failedTasks);
    setIsSyncing(false);
  };

  // 4. Écouter le retour de la connexion Internet
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connexion rétablie ! Lancement de la synchronisation...');
      processQueue();
    };

    window.addEventListener('online', handleOnline);
    
    // Tenter une sync au montage si on est online et qu'il y a des items
    if (navigator.onLine && queue.length > 0) {
      processQueue();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [queue]); // On dépend de queue pour relancer si besoin

  // 5. Fonction exposée pour ajouter une tâche
  const addToQueue = (taskData: Omit<SyncTask, 'id' | 'timestamp' | 'retryCount'>) => {
    const newTask: SyncTask = {
      ...taskData,
      id: crypto.randomUUID(), // Génère un ID unique
      timestamp: Date.now(),
      retryCount: 0,
    };
    setQueue((prev) => [...prev, newTask]);
    alert("Pas de connexion. Données enregistrées localement ! Elles seront envoyées dès le retour du réseau.");
  };

  return (
    <SyncContext.Provider value={{ queue, addToQueue, isSyncing }}>
      {children}
      
      {/* Petit indicateur visuel en bas de l'écran */}
      {queue.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black p-2 text-center text-sm font-bold z-50">
          {isSyncing 
            ? "Synchronisation en cours..." 
            : `Mode Hors Ligne : ${queue.length} élément(s) en attente d'envoi`}
        </div>
      )}
    </SyncContext.Provider>
  );
}