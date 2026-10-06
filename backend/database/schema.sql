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

-- ─── v1.2: privacidad, recuperación de contraseña, moderación ───────────────
-- Todo es idempotente: se ejecuta en cada arranque sin afectar datos existentes.

ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;
-- Para dar acceso al panel de moderación:
--   UPDATE users SET is_admin = TRUE WHERE lower(email) = lower('tu-correo@ejemplo.com');
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Las vacantes existentes quedan 'aprobada' (siguen visibles igual que antes).
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'aprobada';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderation_note TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_moderation_status_check') THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_moderation_status_check
      CHECK (moderation_status IN ('aprobada', 'pendiente', 'en_revision', 'rechazada'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('fraude', 'cobro', 'informacion_falsa', 'ofensivo', 'discriminacion', 'otro')),
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto', 'resuelto', 'descartado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_moderation ON jobs(moderation_status);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(lower(location));
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_reports_status ON job_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_reports_job ON job_reports(job_id);

-- Ejecuta este bloque solo si quieres cuentas de demostración.
-- En producción se recomienda dejar SEED_DEMO_DATA=false.
