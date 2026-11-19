BEGIN;

ALTER TABLE public.focus_sessions
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS public.focus_session_credits (
  session_id UUID NOT NULL REFERENCES public.focus_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  timezone_offset_minutes INTEGER NOT NULL,
  PRIMARY KEY (session_id, user_id)
);

ALTER TABLE public.focus_session_credits ENABLE ROW LEVEL SECURITY;

COMMIT;
