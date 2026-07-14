-- Migración 023: corrección de presupuesto original según planilla oficial
-- actualizada del usuario (columna PRESUPUESTO, hoja de detalle por tarea WIP).
--  - 100101 (Materiales Fabrica): 6.579.000.000 -> 6.540.000.000
--  - Renombres cosméticos: "Costos operacionales" -> "Costos operacionales (OPEX)",
--    "Arriendo y depreciación" -> "Arriendo"
--  - Ítem nuevo (fila #17 de la planilla, mismo patrón de codigo_articulo =
--    tarea_wip + índice secuencial que el resto de filas importadas en 013):
--    3013017 / tarea_wip 30130 "Gastos 2025 proyecto La Chacra", presupuesto en 0.

UPDATE public.financiero_presupuestos
SET presupuesto_original = 6540000000
WHERE codigo_articulo = '100101';

UPDATE public.financiero_presupuestos
SET nombre = 'Costos operacionales (OPEX)'
WHERE codigo_articulo = '8201010';

UPDATE public.financiero_presupuestos
SET nombre = 'Arriendo'
WHERE codigo_articulo = '5014012';

INSERT INTO public.financiero_presupuestos (codigo_articulo, nombre, tarea_wip, presupuesto_original, valor_servicio)
VALUES ('3013017', 'Gastos 2025 proyecto La Chacra', '30130', 0, NULL)
ON CONFLICT (codigo_articulo) DO NOTHING;
