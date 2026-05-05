import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'

let _db: SQLite.SQLiteDatabase | null = null

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = new SQLite.SQLiteDatabase('megesti.db')
    _db.execSync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`)
  }
  return _db
}

export async function initDb(): Promise<void> {
  const db = getDb()

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      reference TEXT,
      image_url TEXT,
      prix_vente_ht REAL NOT NULL,
      taux_tva REAL NOT NULL DEFAULT 5.5,
      stock_local INTEGER NOT NULL DEFAULT 0,
      rayon_nom TEXT,
      isbn TEXT,
      actif INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      point_de_vente_id TEXT NOT NULL,
      point_de_vente_nom TEXT,
      salon_id TEXT,
      date_ouverture TEXT NOT NULL,
      fond_ouverture REAL NOT NULL DEFAULT 0,
      fond_fermeture REAL,
      debiter_stock INTEGER NOT NULL DEFAULT 1,
      statut TEXT NOT NULL DEFAULT 'OUVERTE',
      articles_exposes TEXT,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ventes_locales (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      motif_vente_id TEXT,
      numero INTEGER,
      date_vente TEXT NOT NULL,
      mode_paiement TEXT NOT NULL,
      total_ht REAL NOT NULL,
      total_tva REAL NOT NULL,
      total_ttc REAL NOT NULL,
      lignes_json TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS frais_locaux (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      type TEXT NOT NULL,
      motif TEXT NOT NULL,
      montant_ht REAL,
      date TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
  `)
}

// ── Helpers ────────────────────────────────────────────────────────

export function generateUUID(): string {
  if (Platform.OS === 'web') {
    return crypto.randomUUID()
  }
  // React Native polyfill
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
