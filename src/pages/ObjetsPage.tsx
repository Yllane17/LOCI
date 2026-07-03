// src/pages/ObjetsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFab, IonFabButton, IonIcon, IonList, IonSpinner,
  IonSearchbar, IonSelect, IonSelectOption, IonItem, IonLabel,
  IonAlert, IonRefresher, IonRefresherContent, IonText,
  useIonViewWillEnter,
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { ApiService } from '../services/ApiService';
import { StorageService } from '../services/StorageService';
import { Objet } from '../models/ObjetModel';
import ObjetCard from '../components/ObjetCard';

const ObjetsPage: React.FC = () => {
  const history = useHistory();

  const [objets,   setObjets]   = useState<Objet[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filtre,   setFiltre]   = useState<string>('tous');
  const [erreur,   setErreur]   = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Recharge à chaque fois que l'onglet devient visible
  useIonViewWillEnter(() => { charger(); });

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur('');

    try {
      // 1. Cache local d'abord → affichage immédiat
      const local = await StorageService.getObjets();
      setObjets(filtrer(local, search, filtre));

      // 2. Si réseau dispo → sync + mise à jour
      if (await ApiService.isOnline()) {
        // Rejouer les scans en attente
        const pending = await StorageService.getPendingSync();
        if (pending.length > 0) {
          const syncedIds = await ApiService.syncPending(pending);
          await StorageService.markSynced(syncedIds);
        }

        const apiCat = filtre === 'tous' ? undefined : filtre;
        const distants = await ApiService.getObjets(apiCat);

        // Mise à jour du cache
        await StorageService.saveObjets(distants);
        setObjets(filtrer(distants, search, filtre));
      }
    } catch {
      setErreur('Impossible de charger les objets. Mode hors-ligne activé.');
    } finally {
      setLoading(false);
    }
  }, [search, filtre]);

  // Relancer la recherche à chaque changement
  useEffect(() => { charger(); }, [search, filtre]);

  const confirmerSuppression = async () => {
    if (!deleteId) return;
    const { success, error } = await ApiService.deleteObjet(deleteId);
    if (success) {
      await StorageService.archiveObjet(deleteId);
      await charger();
    } else {
      setErreur(error ?? 'Suppression impossible.');
    }
    setDeleteId(null);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Mes objets</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>

        {/* Pull-to-refresh */}
        <IonRefresher slot="fixed" onIonRefresh={async e => {
          await charger();
          e.detail.complete();
        }}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Recherche + filtre */}
        <IonSearchbar
          value={search}
          onIonChange={e => setSearch(e.detail.value!)}
          placeholder="Rechercher un objet…"
          debounce={300}
        />

        <IonItem>
          <IonLabel>Filtrer</IonLabel>
          <IonSelect
            value={filtre}
            onIonChange={e => setFiltre(e.detail.value)}
          >
            <IonSelectOption value="tous">Tous</IonSelectOption>
            <IonSelectOption value="non_connecte">Non-connecté (QR)</IonSelectOption>
            <IonSelectOption value="connecte">Connecté (BLE)</IonSelectOption>
          </IonSelect>
        </IonItem>

        {/* Erreur réseau */}
        {erreur && (
          <IonText color="warning">
            <p style={{ padding: '8px 16px', fontSize: 13 }}>{erreur}</p>
          </IonText>
        )}

        {/* Chargement */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <IonSpinner name="crescent" />
          </div>
        )}

        {/* Liste vide */}
        {!loading && objets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 48 }}>📦</p>
            <p style={{ color: '#888' }}>Aucun objet enregistré.</p>
            <p style={{ color: '#aaa', fontSize: 13 }}>
              Appuyez sur + pour ajouter votre premier objet.
            </p>
          </div>
        )}

        {/* Liste des objets */}
        <IonList>
          {objets.map(objet => (
            <ObjetCard
              key={objet.id}
              objet={objet}
              onOuvrir={() => history.push(`/tabs/objets/${objet.id}`)}
              onSupprimer={() => setDeleteId(objet.id)}
            />
          ))}
        </IonList>

        {/* Bouton Ajouter */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push('/tabs/objets/nouveau')}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Confirmation suppression */}
        <IonAlert
          isOpen={!!deleteId}
          header="Archiver l'objet ?"
          message="L'historique sera conservé 90 jours."
          buttons={[
            { text: 'Annuler', role: 'cancel', handler: () => setDeleteId(null) },
            { text: 'Archiver', role: 'destructive', handler: confirmerSuppression },
          ]}
        />

      </IonContent>
    </IonPage>
  );
};

// Filtre local côté client
function filtrer(objets: Objet[], search: string, filtre: string): Objet[] {
  return objets
    .filter(o => o.statut !== 'Archive')
    .filter(o => filtre === 'tous' || o.categorie === filtre)
    .filter(o => !search ||
      o.nom.toLowerCase().includes(search.toLowerCase()));
}

export default ObjetsPage;