// src/models/objet.model.ts

export type CategorieObjet = 'connecte' | 'non_connecte';
export type TypeConnectivite = 'BLE' | 'GPS' | 'WiFi' | 'RFID';
export type StatutObjet =
  | 'NonLocalise'
  | 'LocaliseScanRecent'
  | 'LocaliseScanAncien'
  | 'AlerteEnCours'
  | 'Archive'
  | 'Bloque'
  | 'EnAttente';

// Correspond à la réponse de LOCI.Api
export interface Objet {
  id: string;
  nom: string;
  photoUrl?: string;
  categorie: CategorieObjet;
  typeConnectivite?: TypeConnectivite;
  qrCode: string;
  statut: StatutObjet;
  derniereLat?: number;
  derniereLon?: number;
  derniereTs?: string;       // ISO 8601
  createdAt: string;
  updatedAt: string;
}

// Ce qu'on envoie pour créer un objet
export interface CreateObjetDto {
  nom: string;
  categorie: CategorieObjet;
  typeConnectivite?: TypeConnectivite;
  photoUrl?: string;
}

// Ce qu'on envoie pour modifier
export interface UpdateObjetDto {
  nom: string;
  categorie: CategorieObjet;
  typeConnectivite?: TypeConnectivite;
  photoUrl?: string;
}

// Session utilisateur stockée localement
export interface UserSession {
  utilisateurId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

// Item en file de synchronisation hors-ligne
export interface SyncQueueItem {
  id: string;
  tableName: string;
  payload: string;    // JSON stringifié
  createdAt: string;
  synced: boolean;
}