// src/services/api.service.ts
import { AuthService } from './AuthService';
import { Network } from '@capacitor/network';
import {
  Objet,
  CreateObjetDto,
  UpdateObjetDto,
  SyncQueueItem,
} from '../models/ObjetModel';

const BASE = AuthService.getApiBase();

// Headers communs avec token JWT
async function authHeaders(): Promise<HeadersInit> {
  const token = await AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const ApiService = {

  // ── Vérification réseau ────────────────────────────────────────────────────
  async isOnline(): Promise<boolean> {
    const status = await Network.getStatus();
    return status.connected;
  },

  // ── CRUD Objets ────────────────────────────────────────────────────────────

  /** F-OBJ-06 : liste des objets, filtrée par catégorie si précisé */
  async getObjets(categorie?: string): Promise<Objet[]> {
    const url = categorie
      ? `${BASE}/objets?categorie=${categorie}`
      : `${BASE}/objets`;

    const resp = await fetch(url, { headers: await authHeaders() });
    if (!resp.ok) throw new Error('Erreur chargement objets');
    return resp.json();
  },

  /** F-OBJ-01 + F-OBJ-02 : création avec génération QR côté API */
  async createObjet(dto: CreateObjetDto)
    : Promise<{ success: boolean; data?: Objet; error?: string }> {
    const resp = await fetch(`${BASE}/objets`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(dto),
    });
    if (!resp.ok) return { success: false, error: await resp.text() };
    return { success: true, data: await resp.json() };
  },

  /** F-OBJ-04 : modification (QR non modifiable) */
  async updateObjet(id: string, dto: UpdateObjetDto)
    : Promise<{ success: boolean; error?: string }> {
    const resp = await fetch(`${BASE}/objets/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(dto),
    });
    return resp.ok
      ? { success: true }
      : { success: false, error: await resp.text() };
  },

  /** F-OBJ-05 : suppression logique → statut Archive */
  async deleteObjet(id: string)
    : Promise<{ success: boolean; error?: string }> {
    const resp = await fetch(`${BASE}/objets/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    return resp.ok
      ? { success: true }
      : { success: false, error: await resp.text() };
  },

  // ── Scans ──────────────────────────────────────────────────────────────────

  /** Enregistre un scan QR + position GPS sur le serveur */
  async postScan(objetId: string, lat: number, lon: number, isAnonyme = false)
    : Promise<{ success: boolean; error?: string }> {
    const resp = await fetch(`${BASE}/scans`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ objetId, lat, lon, isAnonyme }),
    });
    return resp.ok
      ? { success: true }
      : { success: false, error: await resp.text() };
  },

  // ── Synchronisation hors-ligne (F-SCAN-04) ────────────────────────────────

  /** Rejoue les scans en attente dans la sync_queue locale */
  async syncPending(pending: SyncQueueItem[])
    : Promise<string[]> {   // retourne les IDs synchronisés

    const synced: string[] = [];

    for (const item of pending) {
      try {
        const payload = JSON.parse(item.payload);
        const resp = await fetch(`${BASE}/${item.tableName}`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify(payload),
        });
        if (resp.ok) synced.push(item.id);
      } catch {
        // Réseau toujours indisponible — on réessaie au prochain cycle
      }
    }

    return synced;
  },
};