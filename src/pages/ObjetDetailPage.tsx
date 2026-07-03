// src/pages/ObjetDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonButton, IonSpinner, IonText, IonBackButton, IonButtons,
  IonNote, IonIcon, IonToast,
} from '@ionic/react';
import { downloadOutline, qrCodeOutline } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { ApiService }     from '../services/ApiService';
import { StorageService } from '../services/StorageService';
import { QrService }      from '../services/QrService';
import {
  CreateObjetDto, UpdateObjetDto,
  CategorieObjet, TypeConnectivite,
} from '../models/ObjetModel';
import './ObjetDetailPage.css';

const ObjetDetailPage: React.FC = () => {
  const { id }  = useParams<{ id?: string }>();
  const history = useHistory();

  const isModeCreation = !id || id === 'nouveau';

  // ── Champs du formulaire ──────────────────────────────────────────────────
  const [nom,              setNom]              = useState('');
  const [categorie,        setCategorie]        = useState<CategorieObjet>('non_connecte');
  const [typeConnectivite, setTypeConnectivite] = useState<TypeConnectivite | undefined>();
  const [qrCode,           setQrCode]           = useState('');
  const [qrDataUrl,        setQrDataUrl]        = useState('');

  // ── État de la page ───────────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(!isModeCreation);
  const [saving,    setSaving]    = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erreur,    setErreur]    = useState('');
  const [toast,     setToast]     = useState('');

  const chargerObjet = useCallback(async () => {
    setLoading(true);
    try {
      const local = await StorageService.getObjets();
      const objet = local.find(o => o.id === id);
      if (!objet) { setErreur('Objet introuvable.'); return; }

      setNom(objet.nom);
      setCategorie(objet.categorie);
      setTypeConnectivite(objet.typeConnectivite);
      setQrCode(objet.qrCode);
    } catch {
      setErreur('Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Chargement en mode modification ──────────────────────────────────────
  useEffect(() => {
    if (!isModeCreation) chargerObjet();
  }, [isModeCreation, chargerObjet]);

  // Génère le QR Code visuel dès qu'on a la valeur
  useEffect(() => {
    if (qrCode) {
      QrService.genererDataUrl(qrCode).then(setQrDataUrl);
    }
  }, [qrCode]);

  // ── Validation ────────────────────────────────────────────────────────────
  const valider = (): string | null => {
    if (!nom.trim())
      return 'Le nom est obligatoire.';
    if (nom.trim().length > 100)
      return 'Le nom ne peut pas dépasser 100 caractères.';
    if (categorie === 'connecte' && !typeConnectivite)
      return 'Choisissez un type de connectivité.';
    return null;
  };

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const sauvegarder = async () => {
    const errValidation = valider();
    if (errValidation) { setErreur(errValidation); return; }

    setSaving(true);
    setErreur('');

    try {
      if (isModeCreation) {
        await creer();
      } else {
        await modifier();
      }
    } finally {
      setSaving(false);
    }
  };

  const creer = async () => {
    const dto: CreateObjetDto = {
      nom:              nom.trim(),
      categorie,
      typeConnectivite: categorie === 'connecte' ? typeConnectivite : undefined,
    };

    const { success, data, error } = await ApiService.createObjet(dto);

    if (!success || !data) {
      setErreur(error ?? 'Erreur lors de la création.');
      return;
    }

    // Mise en cache local immédiate
    await StorageService.upsertObjet(data);

    setToast(`« ${data.nom} » créé avec succès !`);
    setTimeout(() => history.replace('/tabs/objets'), 1500);
  };

  const modifier = async () => {
    const dto: UpdateObjetDto = {
      nom:              nom.trim(),
      categorie,
      typeConnectivite: categorie === 'connecte' ? typeConnectivite : undefined,
    };

    const { success, error } = await ApiService.updateObjet(id!, dto);

    if (!success) {
      setErreur(error ?? 'Erreur lors de la modification.');
      return;
    }

    // Mise à jour du cache local
    const local = await StorageService.getObjets();
    const objet = local.find(o => o.id === id);
    if (objet) {
      objet.nom              = dto.nom;
      objet.categorie        = dto.categorie;
      objet.typeConnectivite = dto.typeConnectivite;
      objet.updatedAt        = new Date().toISOString();
      await StorageService.saveObjets(local);
    }

    setToast('Modifications enregistrées.');
    setTimeout(() => history.goBack(), 1500);
  };

  // ── Export QR PNG (F-OBJ-03) ──────────────────────────────────────────────
  const exporterQr = async () => {
    if (!qrCode) return;
    setExporting(true);
    try {
      const fichier = await QrService.exporterPng(qrCode, nom);
      setToast(`QR Code exporté : ${fichier}`);
    } catch {
      setErreur("Impossible d'exporter le QR Code.");
    } finally {
      setExporting(false);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div className="objet-detail-loading">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/objets" />
          </IonButtons>
          <IonTitle>
            {isModeCreation ? 'Nouvel objet' : 'Modifier l\'objet'}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        {/* Erreur */}
        {erreur && (
          <IonText color="danger">
            <p className="objet-detail-error">{erreur}</p>
          </IonText>
        )}

        {/* ── Nom (F-OBJ-01) ─────────────────────────────────────────────── */}
        <IonItem>
          <IonLabel position="floating">Nom de l'objet *</IonLabel>
          <IonInput
            value={nom}
            onIonChange={e => setNom(e.detail.value!)}
            placeholder="Ex. : Clés de la maison"
            maxlength={100}
            clearInput
          />
        </IonItem>
        <IonNote style={{ paddingLeft: 16, fontSize: 12, color: '#aaa' }}>
          {nom.length}/100 caractères
        </IonNote>

        {/* ── Catégorie (F-OBJ-01) ───────────────────────────────────────── */}
        <IonItem style={{ marginTop: 16 }}>
          <IonLabel>Catégorie *</IonLabel>
          <IonSelect
            value={categorie}
            onIonChange={e => {
              setCategorie(e.detail.value);
              if (e.detail.value === 'non_connecte')
                setTypeConnectivite(undefined);
            }}
          >
            <IonSelectOption value="non_connecte">
              🏷️  Non-connecté (QR Code)
            </IonSelectOption>
            <IonSelectOption value="connecte">
              📡  Connecté (BLE / GPS…)
            </IonSelectOption>
          </IonSelect>
        </IonItem>

        {/* ── Type de connectivité (si connecté) ─────────────────────────── */}
        {categorie === 'connecte' && (
          <IonItem>
            <IonLabel>Type de connectivité *</IonLabel>
            <IonSelect
              value={typeConnectivite}
              placeholder="Choisir…"
              onIonChange={e => setTypeConnectivite(e.detail.value)}
            >
              <IonSelectOption value="BLE">Bluetooth LE</IonSelectOption>
              <IonSelectOption value="GPS">GPS</IonSelectOption>
              <IonSelectOption value="WiFi">Wi-Fi</IonSelectOption>
              <IonSelectOption value="RFID">RFID</IonSelectOption>
            </IonSelect>
          </IonItem>
        )}

        {/* ── QR Code (mode modification uniquement — F-OBJ-04) ──────────── */}
        {!isModeCreation && qrCode && (
          <div className="objet-detail-qr-section">
            <p className="objet-detail-qr-title">
              <IonIcon icon={qrCodeOutline} /> QR Code de l'objet
            </p>

            {/* Affichage du QR Code généré */}
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="objet-detail-qr-image"
              />
            )}

            {/* Valeur brute (non modifiable — F-OBJ-04) */}
            <div className="objet-detail-qr-value">
              {qrCode}
            </div>

            {/* Export PNG (F-OBJ-03) */}
            <IonButton
              fill="outline"
              onClick={exporterQr}
              disabled={exporting}
            >
              {exporting
                ? <IonSpinner name="crescent" />
                : <><IonIcon icon={downloadOutline} slot="start" />
                    Exporter PNG</>}
            </IonButton>
          </div>
        )}

        {/* ── Boutons d'action ────────────────────────────────────────────── */}
        <div className="objet-detail-actions">
          <IonButton
            fill="outline"
            expand="block"
            onClick={() => history.goBack()}
            disabled={saving}
          >
            Annuler
          </IonButton>
          <IonButton
            expand="block"
            onClick={sauvegarder}
            disabled={saving}
          >
            {saving
              ? <IonSpinner name="crescent" />
              : isModeCreation ? 'Créer' : 'Sauvegarder'}
          </IonButton>
        </div>

      </IonContent>

      {/* Toast confirmation */}
      <IonToast
        isOpen={!!toast}
        message={toast}
        duration={2000}
        color="success"
        onDidDismiss={() => setToast('')}
      />
    </IonPage>
  );
};

export default ObjetDetailPage;