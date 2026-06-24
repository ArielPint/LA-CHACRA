CREATE TABLE IF NOT EXISTS public.planta_telegram_chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  bot_token text NOT NULL,
  chat_id text NOT NULL,
  eventos text[] DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.planta_telegram_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_tg" ON public.planta_telegram_chats FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tg" ON public.planta_telegram_chats FOR ALL TO authenticated USING (true) WITH CHECK (true);
