// src/services/storage.service.ts
import { Preferences } from '@capacitor/preferences';
import { Objet, SyncQueueItem } from '../models/ObjetModel';

const KEYS = {
  OBJETS:     'loci_objets',
  SYNC_QUEUE: 'loci_sync_queue',
};

export const StorageService = {

  // ── Objets locaux ──────────────────────────────────────────────────────────

  async getObjets(): Promise<Objet[]> {
    const { value } = await Preferences.get({ key: KEYS.OBJETS });
    return value ? JSON.parse(value) : [];
  },

  async saveObjets(objets: Objet[]): Promise<void> {
    await Preferences.set({
      key: KEYS.OBJETS,
      value: JSON.stringify(objets),
    });
  },

  /** Upsert : met à jour si existe, ajoute sinon */
  async upsertObjet(objet: Objet): Promise<void> {
    const all = await StorageService.getObjets();
    const idx = all.findIndex(o => o.id === objet.id);
    if (idx >= 0) all[idx] = objet;
    else all.unshift(objet);
    await StorageService.saveObjets(all);
  },

  async archiveObjet(id: string): Promise<void> {
    const all = await StorageService.getObjets();
    const obj = all.find(o => o.id === id);
    if (obj) {
      obj.statut = 'Archive';
      await StorageService.saveObjets(all);
    }
  },

  // ── Sync Queue (F-SCAN-04) ─────────────────────────────────────────────────

  async getPendingSync(): Promise<SyncQueueItem[]> {
    const { value } = await Preferences.get({ key: KEYS.SYNC_QUEUE });
    const all: SyncQueueItem[] = value ? JSON.parse(value) : [];
    return all.filter(i => !i.synced);
  },

  async addToSyncQueue(
    tableName: string,
    payload: object
  ): Promise<void> {
    const { value } = await Preferences.get({ key: KEYS.SYNC_QUEUE });
    const all: SyncQueueItem[] = value ? JSON.parse(value) : [];
    all.push({
      id:        crypto.randomUUID(),
      tableName,
      payload:   JSON.stringify(payload),
      createdAt: new Date().toISOString(),
      synced:    false,
    });
    await Preferences.set({ key: KEYS.SYNC_QUEUE, value: JSON.stringify(all) });
  },

  async markSynced(ids: string[]): Promise<void> {
    const { value } = await Preferences.get({ key: KEYS.SYNC_QUEUE });
    const all: SyncQueueItem[] = value ? JSON.parse(value) : [];
    all.forEach(i => { if (ids.includes(i.id)) i.synced = true; });
    await Preferences.set({ key: KEYS.SYNC_QUEUE, value: JSON.stringify(all) });
  },
};