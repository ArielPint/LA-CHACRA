-- Migración 020: desglose de financiero_remuneraciones por categoría, alineado
-- a los dos ítems WIP grandes de mano de obra:
--   - WIP 20010 (Mano de Obra Directa Fabrica) se compone de 'operaciones' y
--     'administrativos'.
--   - WIP 30124 (Remuneraciones Adm & Ventas) es la categoría 'adm_ventas'.
-- Las filas históricas (cargadas antes del desglose) se marcan 'operaciones'
-- por defecto; deben reclasificarse a mano si corresponde.

ALTER TABLE public.financiero_remuneraciones
  ADD COLUMN categoria text NOT NULL DEFAULT 'operaciones'
    CHECK (categoria IN ('operaciones', 'administrativos', 'adm_ventas'));

ALTER TABLE public.financiero_remuneraciones
  DROP CONSTRAINT financiero_remuneraciones_unico;

ALTER TABLE public.financiero_remuneraciones
  ADD CONSTRAINT financiero_remuneraciones_unico UNIQUE (mes, anio, categoria);
