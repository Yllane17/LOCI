// src/pages/ScannerPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonText, IonSpinner, IonIcon, IonToast,
  IonAlert, IonNote,
} from '@ionic/react';
import { checkmarkCircleOutline, flashlightOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Geolocation }    from '@capacitor/geolocation';
import { ApiService }     from '../services/ApiService';
import { StorageService } from '../services/StorageService';

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
        formats: ['QR_CODE'],
      });

      if (!barcodes.length) {
        setErreur('Aucun QR Code détecté.');
        return;
      }

      const valeur = barcodes[0].rawValue;

      // Vérifier que c'est un QR Code LOCI (format : LOCI-XXXXXXXX)
      if (!valeur.startsWith('LOCI-')) {
        setErreur("Ce QR Code n'appartient pas à LOCI.");
        return;
      }

      setResultat(valeur);
      await enregistrerPosition(valeur);

    } catch (e: any) {
      if (!e.message?.includes('cancelled'))
        setErreur('Erreur lors du scan : ' + e.message);
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

    } catch (e: any) {
      if (e.message?.includes('timeout') || e.message?.includes('location')) {
        setErreur('GPS indisponible. Vérifiez que la localisation est activée.');
      } else {
        setErreur('Erreur GPS : ' + e.message);
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
        <div style={{ textAlign: 'center', paddingTop: 40 }}>

          {/* Cadre visuel du scanner */}
          <div style={{
            width: 240, height: 240,
            border: '3px solid var(--ion-color-primary)',
            borderRadius: 16,
            margin: '0 auto 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: scanning ? 'rgba(0,0,0,0.05)' : '#f9f9f9',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {scanning ? (
              <>
                {/* Ligne de scan animée */}
                <div style={{
                  position: 'absolute',
                  width: '80%', height: 2,
                  background: 'var(--ion-color-primary)',
                  animation: 'scan-line 2s linear infinite',
                }} />
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
            <div style={{
              background: '#E8F5E9', borderRadius: 12,
              padding: '16px 20px', marginBottom: 24,
            }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#2E7D32' }}>
                ✅ QR Code scanné avec succès
              </p>
              {nomObjet && (
                <p style={{ margin: '4px 0 0', color: '#555' }}>
                  Objet : <strong>{nomObjet}</strong>
                </p>
              )}
            </div>
          )}

          {/* Sauvegarde en cours */}
          {saving && (
            <div style={{ marginBottom: 24 }}>
              <IonSpinner name="crescent" />
              <p style={{ color: '#888', marginTop: 8 }}>
                Enregistrement de la position GPS…
              </p>
            </div>
          )}

          {/* Erreur */}
          {erreur && (
            <IonText color="danger">
              <p style={{ marginBottom: 24, fontSize: 14 }}>{erreur}</p>
            </IonText>
          )}

          {/* Bouton Scanner */}
          <IonButton
            expand="block"
            size="large"
            onClick={demarrerScan}
            disabled={scanning || saving}
            style={{ marginBottom: 12 }}
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

      {/* Animation CSS scan */}
      <style>{`
        @keyframes scan-line {
          0%   { top: 10%; }
          50%  { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>

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