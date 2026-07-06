-- Migración 014: habilitar realtime en las tablas que alimentan el dashboard
-- (financiero_seguimiento_presupuesto se recalcula en cada cambio de estas dos).
ALTER PUBLICATION supabase_realtime ADD TABLE public.financiero_ordenes_compra;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financiero_facturas;
