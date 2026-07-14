-- Migración 029: corrige un error de carga puntual en financiero_remuneraciones.
-- La categoría 'operaciones' de enero 2026 tenía cargado el total completo de
-- "Mano de Obra Directa Fabrica" ($23.318.450) en vez de solo la porción
-- Operaciones ($17.353.653) — verificado contra la planilla EERR del usuario,
-- donde Administrativos ($5.964.797) ya coincidía y Operaciones+Administrativos
-- = $23.318.450 (el total correcto). Los demás meses (feb-jun 2026) ya estaban
-- bien y no se tocan.

UPDATE public.financiero_remuneraciones
SET monto = 17353653
WHERE categoria = 'operaciones' AND mes = 1 AND anio = 2026;
