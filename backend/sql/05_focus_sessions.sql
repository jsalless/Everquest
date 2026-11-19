CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY,
  host_id TEXT NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  guest_id TEXT NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  duration_seconds INTEGER NOT NULL,
  elapsed_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
  running_since TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS focus_sessions_host_id_status_idx
  ON public.focus_sessions(host_id, status);
CREATE INDEX IF NOT EXISTS focus_sessions_guest_id_status_idx
  ON public.focus_sessions(guest_id, status);

CREATE TABLE IF NOT EXISTS public.push_devices (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS push_devices_user_id_idx ON public.push_devices(user_id);

CREATE TABLE IF NOT EXISTS public.push_receipts (
  id TEXT PRIMARY KEY,
  device_token TEXT NOT NULL REFERENCES public.push_devices(token) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS push_receipts_created_at_idx ON public.push_receipts(created_at);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_receipts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.friendships FROM PUBLIC, anon, authenticated;
