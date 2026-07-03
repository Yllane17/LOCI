// src/services/auth.service.ts
import { Preferences } from '@capacitor/preferences';
import { UserSession } from '../models/ObjetModel';

const SESSION_KEY = 'loci_session';

// URL de base de l'API — change selon l'environnement
// Émulateur Android  : http://10.0.2.2:5000/api
// Téléphone physique : http://TON_IP_LOCAL:5000/api  (ex: 192.168.1.10:5000)
// Production         : https://ton-domaine.com/api
const API_BASE = 'http://192.168.1.10:5000/api';

export const AuthService = {

  // ── Inscription ────────────────────────────────────────────────────────────
  async register(email: string, password: string, nom?: string)
    : Promise<{ success: boolean; error?: string }> {

    const resp = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nom }),
    });

    if (!resp.ok) {
      const msg = await resp.text();
      return { success: false, error: msg };
    }

    const session = await resp.json();
    await AuthService.saveSession(session);
    return { success: true };
  },

  // ── Connexion ──────────────────────────────────────────────────────────────
  async login(email: string, password: string)
    : Promise<{ success: boolean; error?: string }> {

    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!resp.ok) {
      return { success: false, error: 'Email ou mot de passe incorrect.' };
    }

    const session = await resp.json();
    await AuthService.saveSession(session);
    return { success: true };
  },

  // ── Déconnexion ────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    await Preferences.remove({ key: SESSION_KEY });
  },

  // ── Session ────────────────────────────────────────────────────────────────
  async saveSession(session: UserSession): Promise<void> {
    await Preferences.set({
      key: SESSION_KEY,
      value: JSON.stringify(session),
    });
  },

  async getSession(): Promise<UserSession | null> {
    const { value } = await Preferences.get({ key: SESSION_KEY });
    return value ? JSON.parse(value) : null;
  },

  async getToken(): Promise<string | null> {
    const session = await AuthService.getSession();
    return session?.accessToken ?? null;
  },

  async isLoggedIn(): Promise<boolean> {
    const session = await AuthService.getSession();
    return !!session?.accessToken;
  },

  getApiBase: () => API_BASE,
};