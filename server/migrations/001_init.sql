-- BACK2CAMPUS — Phase 1 schema.
-- Shared database, strict tenant isolation: every tenant row carries reunion_id,
-- and Row Level Security (FORCED, so it also binds the table owner the app
-- connects as) only shows rows of reunions the current user is an active member of.
-- The API sets app.user_id per request transaction; with no context set, the
-- policies show nothing (fail closed).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------- geography
CREATE TABLE countries (
  code char(2) PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE states (
  id serial PRIMARY KEY,
  country_code char(2) NOT NULL REFERENCES countries(code),
  name text NOT NULL,
  UNIQUE (country_code, name)
);
CREATE TABLE cities (
  id serial PRIMARY KEY,
  state_id int NOT NULL REFERENCES states(id),
  name text NOT NULL,
  short_code text NOT NULL,
  is_live boolean NOT NULL DEFAULT false,
  UNIQUE (state_id, name)
);
INSERT INTO countries VALUES ('IN', 'India');
INSERT INTO states (country_code, name) VALUES ('IN', 'Andhra Pradesh'), ('IN', 'Telangana');
INSERT INTO cities (state_id, name, short_code, is_live)
  SELECT id, 'Visakhapatnam', 'VSKP', true FROM states WHERE name = 'Andhra Pradesh';
INSERT INTO cities (state_id, name, short_code) SELECT id, 'Vijayawada', 'VJA' FROM states WHERE name = 'Andhra Pradesh';
INSERT INTO cities (state_id, name, short_code) SELECT id, 'Hyderabad', 'HYD' FROM states WHERE name = 'Telangana';

-- ---------------------------------------------------------------- accounts
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  phone text,
  city text,
  avatar_url text,
  password_hash text,
  google_sub text UNIQUE,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,              -- sha256 of the cookie value; the raw token is never stored
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_agent text
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

-- ---------------------------------------------------------------- tenants
CREATE TABLE reunions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  invite_token text NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(name) BETWEEN 4 AND 160),
  category text NOT NULL CHECK (category IN ('School','College','Corporate','Friends','Family','Alumni')),
  institution text NOT NULL DEFAULT '',
  batch text NOT NULL DEFAULT '',
  city_id int REFERENCES cities(id),
  city_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  expected int NOT NULL CHECK (expected BETWEEN 2 AND 100000),
  date_from date,
  date_to date,
  budget_per_person int NOT NULL DEFAULT 0 CHECK (budget_per_person >= 0),
  cover_photo_id text NOT NULL DEFAULT 'kidsHug',
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','confirmed','completed')),
  require_approval boolean NOT NULL DEFAULT true,
  voting_deadline date,
  final_date_id uuid,
  final_venue_id uuid,
  payers int NOT NULL DEFAULT 1 CHECK (payers >= 0),
  spent int NOT NULL DEFAULT 0 CHECK (spent >= 0),
  contribution int NOT NULL DEFAULT 0 CHECK (contribution >= 0),
  previous_reunion_id uuid REFERENCES reunions(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  reunion_id uuid NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('organizer','co_organizer','participant')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending')),
  attendance text CHECK (attendance IN ('yes','maybe','no')),
  note text,
  food_pref text CHECK (food_pref IN ('Vegetarian','Non-vegetarian','Vegan','Jain')),
  diet text NOT NULL DEFAULT '',
  checked_in_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reunion_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships(user_id);

CREATE TABLE date_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id uuid NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  day date NOT NULL,
  slot text NOT NULL DEFAULT 'Evening',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reunion_id, day, slot)
);
CREATE TABLE date_votes (
  reunion_id uuid NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  date_option_id uuid NOT NULL REFERENCES date_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  availability text NOT NULL CHECK (availability IN ('yes','maybe','no')),
  PRIMARY KEY (date_option_id, user_id)
);

CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id uuid NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 3 AND 160),
  kind text NOT NULL CHECK (kind IN ('Resort','Hotel','Restaurant','Banquet hall','Beachside','Farmhouse')),
  area text NOT NULL DEFAULT '',
  capacity int NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  tags text[] NOT NULL DEFAULT '{}',
  photo_id text NOT NULL DEFAULT 'beachRoad',
  source text NOT NULL DEFAULT 'member' CHECK (source IN ('member','vendor','google_places')),
  verification text NOT NULL DEFAULT 'Unverified' CHECK (verification IN ('Verified vendor','Google Places','Unverified')),
  suggested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE venue_votes (
  reunion_id uuid NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  PRIMARY KEY (reunion_id, user_id)
);

ALTER TABLE reunions ADD FOREIGN KEY (final_date_id) REFERENCES date_options(id) ON DELETE SET NULL;
ALTER TABLE reunions ADD FOREIGN KEY (final_venue_id) REFERENCES venues(id) ON DELETE SET NULL;

CREATE TABLE budget_items (
  reunion_id uuid NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  key text NOT NULL CHECK (key IN ('venue','food','transport','stay','deco','photo','fun','misc')),
  amount int NOT NULL DEFAULT 0 CHECK (amount >= 0),
  PRIMARY KEY (reunion_id, key)
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id uuid NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 160),
  description text NOT NULL DEFAULT '',
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  due date,
  status text NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started','In Progress','Completed')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id uuid NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Phase 3 (Razorpay). Created now so the screens can list history.
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id uuid NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  amount int NOT NULL CHECK (amount > 0),
  method text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','verified','failed','refunded')),
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  reunion_id uuid REFERENCES reunions(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_reunion_idx ON audit_log(reunion_id, created_at DESC);

-- ---------------------------------------------------------------- RLS
CREATE FUNCTION app_user() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
CREATE FUNCTION app_bypass() RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT coalesce(current_setting('app.bypass', true), '') = 'on' $$;
-- memberships itself is NOT under forced RLS (policies on it would have to read
-- it again and recurse). The API filters every memberships query by user or by
-- a reunion it has already authorised.
CREATE FUNCTION app_is_member(rid uuid) RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT EXISTS (SELECT 1 FROM memberships m WHERE m.reunion_id = rid AND m.user_id = app_user() AND m.status = 'active') $$;

ALTER TABLE reunions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunions FORCE ROW LEVEL SECURITY;
CREATE POLICY reunions_tenant ON reunions
  USING (app_bypass() OR app_is_member(id) OR created_by = app_user())
  WITH CHECK (app_bypass() OR app_is_member(id) OR created_by = app_user());

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['date_options','date_votes','venues','venue_votes','budget_items','tasks','announcements','payments','audit_log'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I USING (app_bypass() OR app_is_member(reunion_id)) WITH CHECK (app_bypass() OR app_is_member(reunion_id))', t || '_tenant', t);
  END LOOP;
END $$;
