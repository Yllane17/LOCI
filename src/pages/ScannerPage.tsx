// src/pages/ScannerPage.tsx
import React, { useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonText, IonSpinner, IonIcon, IonToast, IonNote,
} from '@ionic/react';
import { checkmarkCircleOutline, flashlightOutline } from 'ionicons/icons';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Geolocation }    from '@capacitor/geolocation';
import { ApiService }     from '../services/ApiService';
import { StorageService } from '../services/StorageService';
import './ScannerPage.css';

const ScannerPage: React.FC = () => {

  const [scanning,  setScanning]  = useState(false);
  const [resultat,  setResultat]  = useState('');
  const [nomObjet,  setNomObjet]  = useState('');
  const [toast,     setToast]     = useState('');
  const [erreur,    setErreur]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [torchOn,   setTorchOn]   = useState(false);

  // ── Démarrer le scan ──────────────────────────────────────────────────────
  const demarrerScan = async () => {
    setErreur('');
    setResultat('');
    setNomObjet('');

    // Vérifier la permission caméra
    const { camera } = await BarcodeScanner.checkPermissions();
    if (camera !== 'granted') {
      const { camera: granted } = await BarcodeScanner.requestPermissions();
      if (granted !== 'granted') {
        setErreur("Permission caméra refusée. Autorisez l'accès dans les paramètres.");
        return;
      }
    }

    setScanning(true);

    try {
      // Lancer le scan (s'arrête dès qu'un QR est détecté)
      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      if (!barcodes.length) {
        setErreur('Aucun QR Code détecté.');
        return;
      }

      const valeur = barcodes[0]?.rawValue;
      if (!valeur) {
        setErreur('QR Code invalide.');
        return;
      }

      // Vérifier que c'est un QR Code LOCI (format : LOCI-XXXXXXXX)
      if (!valeur.startsWith('LOCI-')) {
        setErreur("Ce QR Code n'appartient pas à LOCI.");
        return;
      }

      setResultat(valeur);
      await enregistrerPosition(valeur);

    } catch (e: unknown) {
      const error = e as Error;
      if (!error.message?.includes('cancelled'))
        setErreur('Erreur lors du scan : ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  // ── Enregistrer la position GPS après scan ────────────────────────────────
  const enregistrerPosition = async (qrValue: string) => {
    setSaving(true);

    try {
      // 1. Récupérer la position GPS
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const { latitude: lat, longitude: lon } = position.coords;

      // 2. Extraire l'objetId depuis la valeur QR (format : LOCI-{objetId})
      const objetId = qrValue.replace('LOCI-', '').toLowerCase();

      // 3. Trouver le nom de l'objet dans le cache local pour l'afficher
      const local  = await StorageService.getObjets();
      const trouve = local.find(o =>
        o.id.replace(/-/g, '').toUpperCase() === objetId.replace(/-/g, '').toUpperCase()
      );
      if (trouve) setNomObjet(trouve.nom);

      // 4. Envoyer au serveur (ou mettre en file si hors-ligne)
      const online = await ApiService.isOnline();

      if (online) {
        const { success, error } = await ApiService.postScan(
          objetId, lat, lon, false
        );
        if (success) {
          setToast(`📍 Position enregistrée${trouve ? ` pour « ${trouve.nom} »` : ''}`);

          // Mise à jour du cache local
          if (trouve) {
            trouve.derniereLat = lat;
            trouve.derniereLon = lon;
            trouve.derniereTs  = new Date().toISOString();
            trouve.statut      = 'LocaliseScanRecent';
            await StorageService.upsertObjet(trouve);
          }
        } else {
          setErreur(error ?? 'Erreur serveur.');
        }
      } else {
        // Hors-ligne → file d'attente (F-SCAN-04)
        await StorageService.addToSyncQueue('scans', {
          objetId, lat, lon, isAnonyme: false,
          timestamp: new Date().toISOString(),
        });
        setToast('📶 Hors-ligne — scan mis en file de synchronisation.');
      }

    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('timeout') || error.message?.includes('location')) {
        setErreur('GPS indisponible. Vérifiez que la localisation est activée.');
      } else {
        setErreur('Erreur GPS : ' + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Torche ────────────────────────────────────────────────────────────────
  const toggleTorch = async () => {
    await BarcodeScanner.toggleTorch();
    setTorchOn(prev => !prev);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Scanner un QR Code</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        {/* ── Zone de scan ─────────────────────────────────────────────────── */}
        <div className="scanner-container">

          {/* Cadre visuel du scanner */}
          <div className={`scanner-frame ${scanning ? 'scanning' : ''}`}>
            {scanning ? (
              <>
                {/* Ligne de scan animée */}
                <div className="scanner-line" />
                <IonSpinner name="lines" style={{ fontSize: 40 }} />
              </>
            ) : resultat ? (
              <IonIcon
                icon={checkmarkCircleOutline}
                style={{ fontSize: 80, color: '#4CAF50' }}
              />
            ) : (
              <p style={{ color: '#bbb', fontSize: 14, padding: 20 }}>
                Appuyez sur « Scanner »{'\n'}
                et pointez la caméra vers le QR Code
              </p>
            )}
          </div>

          {/* Résultat du scan */}
          {resultat && !saving && (
            <div className="scanner-result">
              <p className="scanner-result-title">
                ✅ QR Code scanné avec succès
              </p>
              {nomObjet && (
                <p className="scanner-result-object">
                  Objet : <strong>{nomObjet}</strong>
                </p>
              )}
            </div>
          )}

          {/* Sauvegarde en cours */}
          {saving && (
            <div className="scanner-saving">
              <IonSpinner name="crescent" />
              <p className="scanner-saving-text">
                Enregistrement de la position GPS…
              </p>
            </div>
          )}

          {/* Erreur */}
          {erreur && (
            <IonText color="danger">
              <p className="scanner-error">{erreur}</p>
            </IonText>
          )}

          {/* Bouton Scanner */}
          <IonButton
            expand="block"
            size="large"
            onClick={demarrerScan}
            disabled={scanning || saving}
            className="scanner-button"
          >
            {scanning ? 'Scan en cours…' : '📷  Scanner un QR Code'}
          </IonButton>

          {/* Bouton torche */}
          <IonButton
            fill="outline"
            expand="block"
            onClick={toggleTorch}
            disabled={!scanning}
          >
            <IonIcon icon={flashlightOutline} slot="start" />
            {torchOn ? 'Éteindre la torche' : 'Allumer la torche'}
          </IonButton>

          {/* Info mode hors-ligne */}
          <IonNote style={{
            display: 'block', marginTop: 24,
            fontSize: 12, color: '#aaa',
          }}>
            Sans réseau, le scan est sauvegardé localement{'\n'}
            et synchronisé automatiquement à la reconnexion.
          </IonNote>

        </div>

      </IonContent>

      <IonToast
        isOpen={!!toast}
        message={toast}
        duration={3000}
        color="success"
        position="bottom"
        onDidDismiss={() => setToast('')}
      />
    </IonPage>
  );
};

export default ScannerPage;