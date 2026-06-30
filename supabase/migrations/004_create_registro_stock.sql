-- Migración 004: tabla de stock semanal
-- Reemplaza la hoja REG STOCK del Excel como fuente de datos para la pestaña Stock del dashboard.
-- Los campos derivados (alcance, valor stock, etc.) se calculan en el cliente desde el catálogo y registro_compras.

CREATE TABLE IF NOT EXISTS public.registro_stock (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha        date NOT NULL,
  semana_key   text NOT NULL,          -- timestamp ms del lunes de la semana (mismo formato que dashboard.js)
  codigo       text NOT NULL,
  material     text NOT NULL,
  unidad       text NOT NULL DEFAULT 'UND',
  stock_fisico numeric NOT NULL DEFAULT 0,
  created_by   text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  CONSTRAINT registro_stock_semana_codigo_key UNIQUE (semana_key, codigo)
);

ALTER TABLE public.registro_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registro_stock_select" ON public.registro_stock FOR SELECT USING (true);
CREATE POLICY "registro_stock_insert" ON public.registro_stock FOR INSERT WITH CHECK (true);
CREATE POLICY "registro_stock_update" ON public.registro_stock FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "registro_stock_delete" ON public.registro_stock FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS registro_stock_semana_idx ON public.registro_stock (semana_key);
CREATE INDEX IF NOT EXISTS registro_stock_fecha_idx  ON public.registro_stock (fecha DESC);
