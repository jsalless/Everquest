CREATE TABLE IF NOT EXISTS public.wardrobe_items (
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
