-- Migración 024: completa financiero_ordenes_compra (partida 100101, Materiales
-- Fabrica) con las OC que ya existían en registro-gd (tabla ordenes_compra +
-- oc_guias + registro_compras, mismo proyecto Supabase) pero no se habían
-- traído al módulo Financiero. Monto = suma de VTI de las guías vinculadas a
-- cada OC en registro-gd (mismo cálculo que hace registro-gd.html). Proveedor
-- no venía cargado para casi ninguna de estas OC en registro-gd; a pedido del
-- usuario se usa "TECNOFAST" para todas. estado se deja en su default
-- ('ABIERTA'): ninguna de estas OC tiene factura cargada todavía.

INSERT INTO public.financiero_ordenes_compra
  (numero_oc, presupuesto_id, serie, proveedor_rut, nombre_proveedor_raw, fecha, neto, detalle, mes, anio)
SELECT
  v.numero_oc, p.id, '100101', NULL, 'TECNOFAST',
  v.fecha, v.neto, v.detalle,
  EXTRACT(MONTH FROM v.fecha)::smallint, EXTRACT(YEAR FROM v.fecha)::smallint
FROM (VALUES
  ('6469', DATE '2026-07-11', 109149442, NULL),
  ('6403', DATE '2026-06-30',  36916705, NULL),
  ('6404', DATE '2026-06-30', 116143152, NULL),
  ('6344', DATE '2026-06-19',  91996206, 'MP'),
  ('6310', DATE '2026-06-16',   8895641, 'VENTANAS'),
  ('6294', DATE '2026-06-12',  44439873, 'MP'),
  ('6267', DATE '2026-06-09',   4818317, 'EPS'),
  ('6257', DATE '2026-06-08',   2738868, 'EPS'),
  ('6266', DATE '2026-06-05',  43608613, 'MP'),
  ('6231', DATE '2026-06-02',   2738868, NULL),
  ('6237', DATE '2026-06-02',  17185547, 'KDM MAYO')
) AS v(numero_oc, fecha, neto, detalle)
JOIN public.financiero_presupuestos p ON p.codigo_articulo = '100101'
ON CONFLICT (numero_oc, presupuesto_id) DO NOTHING;
