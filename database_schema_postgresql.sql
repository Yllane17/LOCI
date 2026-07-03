-- ============================================
-- SCHÉMA POSTGRESQL — LOCI (Annexe A adaptée du CDC)
-- À exécuter dans l'éditeur SQL de Supabase, ou via psql en local.
-- Note : EF Core (LOCI.Api) peut aussi générer ce schéma via migrations
-- (dotnet ef migrations add Init / dotnet ef database update) — ce script
-- est fourni en complément pour une mise en place manuelle rapide.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE utilisateurs (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                    TEXT UNIQUE NOT NULL,
    password_hash            TEXT NOT NULL,
    nom                      TEXT,
    photo_url                TEXT,
    refresh_token            TEXT,
    refresh_token_expires_at TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE objets (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilisateur_id           UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    nom                      TEXT NOT NULL CHECK (char_length(nom) BETWEEN 1 AND 100),
    photo_url                TEXT,
    categorie                TEXT NOT NULL CHECK (categorie IN ('Connecte','NonConnecte')),
    type_connectivite        TEXT CHECK (type_connectivite IN ('BLE','GPS','WiFi','RFID')),
    qr_code                  TEXT UNIQUE NOT NULL,
    statut                   TEXT NOT NULL DEFAULT 'NonLocalise',
    derniere_lat             DOUBLE PRECISION,
    derniere_lon             DOUBLE PRECISION,
    derniere_ts              TIMESTAMPTZ,
    zone_confiance_geojson   TEXT,
    est_archive              BOOLEAN NOT NULL DEFAULT false,
    archived_at              TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trajectoires (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    objet_id     UUID NOT NULL REFERENCES objets(id) ON DELETE CASCADE,
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
    lat          DOUBLE PRECISION NOT NULL,
    lon          DOUBLE PRECISION NOT NULL,
    precision_m  INTEGER,
    source       TEXT NOT NULL CHECK (source IN ('Gps','Wifi','Ble','Qr','Inference')),
    confiance    DOUBLE PRECISION CHECK (confiance BETWEEN 0.0 AND 1.0)
);

CREATE TABLE scans (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    objet_id                 UUID NOT NULL REFERENCES objets(id) ON DELETE CASCADE,
    scanner_utilisateur_id   UUID REFERENCES utilisateurs(id),
    timestamp                TIMESTAMPTZ NOT NULL DEFAULT now(),
    lat                      DOUBLE PRECISION NOT NULL,
    lon                      DOUBLE PRECISION NOT NULL,
    precision_m              INTEGER,
    est_anonyme              BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE predictions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    objet_id    UUID NOT NULL REFERENCES objets(id) ON DELETE CASCADE,
    lat         DOUBLE PRECISION NOT NULL,
    lon         DOUBLE PRECISION NOT NULL,
    probabilite DOUBLE PRECISION NOT NULL,
    rang        INTEGER NOT NULL CHECK (rang BETWEEN 1 AND 3),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alertes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    objet_id        UUID NOT NULL REFERENCES objets(id) ON DELETE CASCADE,
    utilisateur_id  UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    message         TEXT NOT NULL,
    lue             BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index utiles pour les requêtes fréquentes (liste paginée, carte, historique 7 jours)
CREATE INDEX idx_objets_utilisateur ON objets(utilisateur_id) WHERE NOT est_archive;
CREATE INDEX idx_trajectoires_objet_ts ON trajectoires(objet_id, timestamp DESC);
CREATE INDEX idx_scans_objet_ts ON scans(objet_id, timestamp DESC);
CREATE INDEX idx_alertes_utilisateur_lue ON alertes(utilisateur_id, lue);
