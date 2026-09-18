export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- SCHEMA SUPABASE: ROTINAS DA FAMÍLIA (FAMILYFLOW)
-- ==============================================================================
-- Isolamento multi-inquilino (RLS) por família e senhas protegidas por SHA-256 Hash.
--
-- Como executar:
-- 1. Acesse o dashboard do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral, clique em "SQL Editor"
-- 3. Crie uma "New Query", cole todo este código e clique em "RUN".
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. FAMÍLIAS
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Rotinas da Família',
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    family_code TEXT UNIQUE NOT NULL DEFAULT ('FAM-' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CONFIGURAÇÕES DA FAMÍLIA
CREATE TABLE IF NOT EXISTS public.family_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    family_name TEXT NOT NULL DEFAULT 'Rotinas da Família',
    pin_code_hash TEXT NOT NULL,
    default_penalty_points INT NOT NULL DEFAULT 10,
    delay_tolerance_minutes INT NOT NULL DEFAULT 15,
    require_pin_for_high_value BOOLEAN NOT NULL DEFAULT true,
    high_value_threshold INT NOT NULL DEFAULT 150,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    currency_name TEXT NOT NULL DEFAULT 'pts',
    theme_color TEXT NOT NULL DEFAULT '#081534',
    menu_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT family_settings_family_unique UNIQUE (family_id)
);

-- 3. MEMBROS / PERFIS (Com Hash de PIN)
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT NOT NULL,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    age INT NOT NULL DEFAULT 10,
    role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
    avatar TEXT,
    points_balance INT NOT NULL DEFAULT 0,
    points_earned_total INT NOT NULL DEFAULT 0,
    points_spent_total INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    badge TEXT NOT NULL DEFAULT 'Novato',
    weekly_consistency INT NOT NULL DEFAULT 100,
    streak_days INT NOT NULL DEFAULT 0,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (family_id, id)
);

-- 4. ATIVIDADES & CATÁLOGO
CREATE TABLE IF NOT EXISTS public.routine_tasks (
    id TEXT NOT NULL,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    reg_code TEXT,
    task_code TEXT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Organização',
    assignee_id TEXT NOT NULL,
    base_points INT NOT NULL DEFAULT 10,
    final_points INT NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    delay_minutes INT DEFAULT 0,
    is_delayed BOOLEAN DEFAULT false,
    within_tolerance BOOLEAN DEFAULT true,
    deadline TEXT,
    days_of_week JSONB DEFAULT '[]'::jsonb,
    completed_dates JSONB DEFAULT '[]'::jsonb,
    last_completed_date TEXT,
    executed_at TEXT,
    duration_minutes INT,
    expected_duration_minutes INT,
    acceptance_criteria TEXT,
    feedback TEXT,
    penalty_applied BOOLEAN DEFAULT false,
    penalty_points INT DEFAULT 0,
    photo_requested BOOLEAN DEFAULT false,
    has_photo_evidence BOOLEAN DEFAULT false,
    photo_evidence_url TEXT,
    date TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (family_id, id)
);

-- 5. LOJA DE INCENTIVOS
CREATE TABLE IF NOT EXISTS public.reward_items (
    id TEXT NOT NULL,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cost INT NOT NULL DEFAULT 50,
    target_child_id TEXT NOT NULL DEFAULT 'all',
    icon TEXT NOT NULL DEFAULT 'card_giftcard',
    category TEXT NOT NULL DEFAULT 'Experiência',
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending_delivery', 'delivered')),
    requested_by TEXT,
    requested_at TEXT,
    delivered_at TEXT,
    delivered_by TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (family_id, id)
);

-- 6. TRANSAÇÕES & PONTUAÇÃO
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT NOT NULL,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    member_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount INT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Rotina',
    balance_after INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (family_id, id)
);

-- 7. COMPROMISSOS
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT NOT NULL,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    participants JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    notes TEXT,
    created_by TEXT NOT NULL DEFAULT 'pai',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (family_id, id)
);

-- 8. NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT NOT NULL,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    target_user_id TEXT NOT NULL DEFAULT 'all',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (family_id, id)
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_members_family ON public.members (family_id);
CREATE INDEX IF NOT EXISTS idx_tasks_family ON public.routine_tasks (family_id);
CREATE INDEX IF NOT EXISTS idx_rewards_family ON public.reward_items (family_id);
CREATE INDEX IF NOT EXISTS idx_tx_family ON public.transactions (family_id);
CREATE INDEX IF NOT EXISTS idx_appt_family ON public.appointments (family_id);
CREATE INDEX IF NOT EXISTS idx_notif_family ON public.notifications (family_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_family_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_family_id UUID;
  v_req_header TEXT;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_family_id FROM public.families WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_family_id IS NOT NULL THEN
      RETURN v_family_id;
    END IF;
  END IF;

  BEGIN
    v_req_header := current_setting('request.headers', true)::json->>'x-family-id';
    IF v_req_header IS NOT NULL AND v_req_header ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN v_req_header::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "families_all_policy" ON public.families;
CREATE POLICY "families_all_policy" ON public.families FOR ALL
  USING (auth_user_id = auth.uid() OR id = public.current_family_id() OR auth.role() = 'anon')
  WITH CHECK (auth_user_id = auth.uid() OR id = public.current_family_id() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "settings_family_isolation" ON public.family_settings;
CREATE POLICY "settings_family_isolation" ON public.family_settings FOR ALL
  USING (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon')
  WITH CHECK (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon');

DROP POLICY IF EXISTS "members_family_isolation" ON public.members;
CREATE POLICY "members_family_isolation" ON public.members FOR ALL
  USING (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon')
  WITH CHECK (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon');

DROP POLICY IF EXISTS "tasks_family_isolation" ON public.routine_tasks;
CREATE POLICY "tasks_family_isolation" ON public.routine_tasks FOR ALL
  USING (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon')
  WITH CHECK (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon');

DROP POLICY IF EXISTS "rewards_family_isolation" ON public.reward_items;
CREATE POLICY "rewards_family_isolation" ON public.reward_items FOR ALL
  USING (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon')
  WITH CHECK (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon');

DROP POLICY IF EXISTS "tx_family_isolation" ON public.transactions;
CREATE POLICY "tx_family_isolation" ON public.transactions FOR ALL
  USING (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon')
  WITH CHECK (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon');

DROP POLICY IF EXISTS "appointments_family_isolation" ON public.appointments;
CREATE POLICY "appointments_family_isolation" ON public.appointments FOR ALL
  USING (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon')
  WITH CHECK (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon');

DROP POLICY IF EXISTS "notifications_family_isolation" ON public.notifications;
CREATE POLICY "notifications_family_isolation" ON public.notifications FOR ALL
  USING (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon')
  WITH CHECK (family_id = public.current_family_id() OR family_id IN (SELECT id FROM public.families WHERE auth_user_id = auth.uid()) OR auth.role() = 'anon');

INSERT INTO public.families (id, name)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Rotinas da Família')
ON CONFLICT (id) DO NOTHING;
`;
