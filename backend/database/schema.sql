CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('candidato', 'empresa')),
  phone TEXT,
  company_name TEXT,
  sector TEXT,
  description TEXT,
  logo TEXT,
  website TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  cv TEXT,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience TEXT,
  education TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Tiempo completo',
  salary TEXT NOT NULL DEFAULT 'A convenir',
  location TEXT NOT NULL DEFAULT 'Zitácuaro, Michoacán',
  description TEXT NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule TEXT NOT NULL DEFAULT 'A definir',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  cv TEXT,
  cover_letter TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'revision' CHECK (status IN ('revision', 'aceptado', 'rechazado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_active_created ON jobs(active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id, created_at DESC);

-- Ejecuta este bloque solo si quieres cuentas de demostración.
-- En producción se recomienda dejar SEED_DEMO_DATA=false.
