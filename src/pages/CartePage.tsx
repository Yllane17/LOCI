// src/pages/CartePage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonFab, IonFabButton, IonIcon, IonSpinner, IonText,
  IonChip, IonLabel,
} from '@ionic/react';
import { locateOutline } from 'ionicons/icons';
import { Geolocation }    from '@capacitor/geolocation';
import { StorageService } from '../services/StorageService';
import { Objet }          from '../models/ObjetModel';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './CartePage.css';

// Fix icônes Leaflet avec Webpack/Vite
const defaultIconPrototype = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
delete defaultIconPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icônes personnalisées selon le statut
const iconVert  = L.divIcon({
  html: '<div style="background:#4CAF50;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});
const iconGris  = L.divIcon({
  html: '<div style="background:#9E9E9E;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});
const iconOrange = L.divIcon({
  html: '<div style="background:#FF9800;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});

const CartePage: React.FC = () => {
  const mapRef       = useRef<L.Map | null>(null);
  const mapDivRef    = useRef<HTMLDivElement>(null);
  const markersRef   = useRef<L.Marker[]>([]);

  const [objets,    setObjets]    = useState<Objet[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [erreur,    setErreur]    = useState('');

  const afficherMarqueurs = useCallback((objets: Objet[]) => {
    if (!mapRef.current) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    objets.forEach(objet => {
      if (!objet.derniereLat || !objet.derniereLon) return;

      // Choisir l'icône selon le statut
      const statutIcones: Partial<Record<Objet['statut'], L.DivIcon>> = {
        LocaliseScanRecent: iconVert,
        AlerteEnCours:      iconOrange,
      };
      const icone = statutIcones[objet.statut] ?? iconGris;

      const dateLabel = objet.derniereTs
        ? new Date(objet.derniereTs).toLocaleString('fr-FR')
        : 'Date inconnue';

      const marqueur = L.marker(
        [objet.derniereLat, objet.derniereLon],
        { icon: icone }
      )
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="min-width:160px">
            <strong>${objet.nom}</strong><br/>
            <small style="color:#888">${objet.categorie === 'connecte' ? '📡 Connecté' : '🏷️ Non-connecté'}</small><br/>
            <small>📅 ${dateLabel}</small><br/>
            <small>📍 ${objet.derniereLat.toFixed(5)}, ${objet.derniereLon.toFixed(5)}</small>
          </div>
        `);

      markersRef.current.push(marqueur);
    });

    // Ajuster le zoom pour voir tous les marqueurs
    if (markersRef.current.length > 0) {
      const groupe = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(groupe.getBounds().pad(0.2));
    }
  }, []);

  // ── Chargement et affichage des objets ────────────────────────────────────
  const chargerObjets = useCallback(async () => {
    setLoading(true);
    try {
      const local = await StorageService.getObjets();
      const avecPosition = local.filter(
        o => o.derniereLat && o.derniereLon && o.statut !== 'Archive'
      );
      setObjets(avecPosition);
      afficherMarqueurs(avecPosition);
    } catch {
      setErreur('Erreur de chargement des objets.');
    } finally {
      setLoading(false);
    }
  }, [afficherMarqueurs]);

  // ── Initialisation de la carte Leaflet ────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    // Centré sur Yaoundé par défaut
    mapRef.current = L.map(mapDivRef.current, {
      center: [3.848, 11.502],
      zoom:   13,
      zoomControl: true,
    });

    // Tuiles OpenStreetMap (gratuit, sans clé API)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    chargerObjets();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [chargerObjets]);

  // ── Centrer sur ma position ───────────────────────────────────────────────
  const centrerSurMoi = async () => {
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });

      const { latitude: lat, longitude: lon } = pos.coords;
      mapRef.current?.setView([lat, lon], 15);

      // Marqueur "Ma position" en bleu
      L.circleMarker([lat, lon], {
        radius: 8, color: '#1976D2', fillColor: '#2196F3',
        fillOpacity: 0.9, weight: 2,
      })
        .addTo(mapRef.current!)
        .bindPopup('<strong>📍 Ma position</strong>')
        .openPopup();

    } catch {
      setErreur('Impossible de récupérer votre position GPS.');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Carte des objets</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>

        {/* Légende */}
        <div className="carte-page-legend">
          <div>🟢 Récent (&lt; 24h)</div>
          <div>🟠 Alerte en cours</div>
          <div>⚫ Ancien / inconnu</div>
        </div>

        {/* Compteur d'objets */}
        {!loading && (
          <div className="carte-page-count">
            <IonChip color="primary">
              <IonLabel>{objets.length} objet{objets.length > 1 ? 's' : ''}</IonLabel>
            </IonChip>
          </div>
        )}

        {/* Chargement */}
        {loading && (
          <div className="carte-page-loading">
            <IonSpinner name="crescent" />
          </div>
        )}

        {/* Erreur */}
        {erreur && (
          <IonText color="danger" className="carte-page-error">
            <p className="carte-page-error-text">{erreur}</p>
          </IonText>
        )}

        {/* Conteneur de la carte Leaflet */}
        <div
          ref={mapDivRef}
          className="carte-page-map"
        />

        {/* Bouton centrer sur ma position */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={centrerSurMoi} color="light">
            <IonIcon icon={locateOutline} />
          </IonFabButton>
        </IonFab>

      </IonContent>
    </IonPage>
  );
};

export default CartePage;

