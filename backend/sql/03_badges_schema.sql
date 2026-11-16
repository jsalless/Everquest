-- =============================================================================
-- EVERQUEST - PASSO 3: INSÍGNIAS (BADGES) E CONQUISTAS DOS USUÁRIOS
-- Compatível com Supabase (PostgreSQL)
-- =============================================================================

-- 1. Tabela de Insígnias (public.badges)
-- Cada insígnia possui título, descrição, imagem e objetivo (goal_type + goal_target)
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  goal_target INTEGER NOT NULL DEFAULT 1 CHECK (goal_target >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Progresso e Desbloqueio de Insígnias por Usuário (public.user_badges)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges (user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges (badge_id);

-- 3. Insere as 3 Insígnias Oficiais (Badge1, Badge2, Badge3)
INSERT INTO public.badges (id, title, description, image, goal_type, goal_target)
VALUES
  (
    'badge1',
    'Primeira tarefa',
    'Conclua sua primeira tarefa',
    'badge1',
    'tasks_completed',
    1
  ),
  (
    'badge2',
    'Construindo comunidade',
    'Atinja o número de 10 amigos',
    'badge2',
    'friends_count',
    10
  ),
  (
    'badge3',
    'Suma transcendência',
    'Foque por 30 horas',
    'badge3',
    'focus_hours',
    30
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  goal_type = EXCLUDED.goal_type,
  goal_target = EXCLUDED.goal_target,
  updated_at = NOW();

-- 4. Políticas de Row Level Security (RLS)
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso completo badges" ON public.badges;
CREATE POLICY "Acesso completo badges"
  ON public.badges FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso completo user_badges" ON public.user_badges;
CREATE POLICY "Acesso completo user_badges"
  ON public.user_badges FOR ALL
  USING (true)
  WITH CHECK (true);

