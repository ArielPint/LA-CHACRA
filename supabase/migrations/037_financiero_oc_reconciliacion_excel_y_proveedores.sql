-- Migración 037: reconciliación de OC contra "Control Avance La Chacra al
-- 30-06-2026.xlsx" (hoja OC, 82 filas) + reutilización de financiero_proveedores
-- desde toda la web (ya existía, solo le faltaba consumo real).
--
--  1) Inserta 12 OC que estaban en el Excel y no en la base.
--  2) Reclasifica 2 OC con WIP equivocado (mismo monto, confirmado con el
--     usuario): 6040 pasa de 82010 (Costos operacionales) a 10070
--     (Materiales de transporte); 5788 pasa de 30125 (Otros gastos admin) a
--     82010 (Costos operacionales).
--  3) Corrige el monto de la OC 5981 (Excel dice 8.746.800, no 7.771.200 —
--     confirmado con el usuario).
--  4) Upsert de 21 proveedores (RUT+nombre) a financiero_proveedores.
--  5) Backfill de proveedor_rut/nombre_proveedor_raw en 61 OC existentes que
--     no tenían RUT cargado o tenían un nombre genérico/placeholder.
--  6) Agrega proveedor_rut a financiero_gastos_directos, para que el
--     selector de proveedor pueda usarse ahí también.
--
-- Nota: 6086 (WIP 82010) y 6118 (WIP 30125) existen en la base pero no
-- aparecen en el Excel — a pedido del usuario, quedan sin tocar por ahora.

-- (4) Proveedores (upsert) -- va primero: el insert de OC referencia proveedor_rut por FK
INSERT INTO public.financiero_proveedores (rut, nombre)
VALUES
  ('17030413-6', 'Jorge Martinez'),
  ('76011325-5', 'COMERCIAL ROLLE S.A.'),
  ('76105101-6', 'COMERCIAL SIRIAN LIMITADA'),
  ('76130710-K', 'SOC COMERCIAL Y AISLANTES SUR POL LIMITADA'),
  ('76320186-4', 'TECNO FAST S.A.'),
  ('76427363-K', 'SOCIEDAD POR ACCIONES DISTRIBUIDORA INDUSTRIAL CYNAPLUS SPA'),
  ('76452392-K', 'EPS CHILE SPA'),
  ('76691453-5', 'COMERCIAL PDUARTE SPA'),
  ('76751794-7', 'C Y D SPA'),
  ('76821330-5', 'IMPERIAL S.A.'),
  ('77272640-6', 'FACORO DEL SUR SPA'),
  ('77857738-0', 'EMVI CONSTRUCCION Y OBRAS CIVILES SPA'),
  ('78047676-1', 'WE DO CONSTRUCCIONES SPA'),
  ('78142744-6', 'CARPAS PUERTO MONTT SPA'),
  ('78182958-7', 'MAESTRANZA LOS LAGOS SPA'),
  ('78188079-5', 'CONBES SPA'),
  ('78307160-6', 'SOCIEDAD COMERCIAL OFIMASTER SPA'),
  ('78524720-5', 'ARCHIPLAN PROYECTOS DE ARQUITECTURA SOCIEDAD ANONIMA'),
  ('79877600-2', 'PATRICIO DIAZ E HIJOS SPA'),
  ('83472500-2', 'TATTERSALL MAQUINARIAS S.A.'),
  ('96977750-9', 'INGENIERIA C.G. S.A.')
ON CONFLICT (rut) DO UPDATE SET nombre = EXCLUDED.nombre, updated_at = now();

-- (1) OC faltantes
INSERT INTO public.financiero_ordenes_compra
  (numero_oc, presupuesto_id, serie, proveedor_rut, nombre_proveedor_raw, fecha, neto, detalle, mes, anio)
SELECT v.numero_oc, p.id, v.codigo, v.rut, v.nombre, v.fecha, v.neto, v.detalle,
       EXTRACT(MONTH FROM v.fecha)::smallint, EXTRACT(YEAR FROM v.fecha)::smallint
FROM (VALUES
  ('5252', '100101', '76320186-4', 'TECNO FAST S.A.', DATE '2025-11-20', 12199287, 'MATERIALES COMPRADOS A TF DURANTE EL MES DE OCTUBRE PARA PROYECTO LA CHACRA'),
  ('6246', '200206', '78047676-1', 'WE DO CONSTRUCCIONES SPA', DATE '2026-06-04', 109185648, 'SUBCONTRATO TERMINACIONES MODULOS SECO Y HÚMEDOS CORRESPONDIENTE A LA CHACRA'),
  ('6013', '8201010', '78182958-7', 'MAESTRANZA LOS LAGOS SPA', DATE '2026-04-20', 2460000, 'FABRICACIÓN DE ELEMENTOS PARA USO EN PROYECTO LA CHACRA - COTIZACIÓN 138'),
  ('6054', '8201010', '76320186-4', 'TECNO FAST S.A.', DATE '2026-04-28', 25710015, 'Ampliación TENT 20x30 Puerto Varas - Proyecto La Chacra, Planta Sur - Cotización N. OP-85666 / Q-114751'),
  ('6117', '8201010', '77857738-0', 'EMVI CONSTRUCCION Y OBRAS CIVILES SPA', DATE '2026-05-11', 2500000, 'INSTALACIÓN DE FUNDACIONES DE HORMIGON EN CARPA DE LA CHACRA - Cotización N.: 80'),
  ('6171', '8201010', '76320186-4', 'TECNO FAST S.A.', DATE '2026-05-13', 25087238, 'Arriendo de carpa 15x30 - Cotización OP-86838 - Q-116024'),
  ('6153', '8201010', '76821330-5', 'IMPERIAL S.A.', DATE '2026-05-14', 302536, 'Lijadoras solicitadas por C. Aguilera para uso en módulos La Chacra - Cotización: 0058895925'),
  ('6178', '8201010', '76105101-6', 'COMERCIAL SIRIAN LIMITADA', DATE '2026-05-20', 111765, 'Dados de impacto T40 cuadrante (20 unidades) solicitados por Carlos Aguilera - Cotización S03077'),
  ('6321', '8201010', '76011325-5', 'COMERCIAL ROLLE S.A.', DATE '2026-06-17', 285400, 'Brocas y Mandril para Holdown - Cotización 11250'),
  ('6355', '8201010', '77857738-0', 'EMVI CONSTRUCCION Y OBRAS CIVILES SPA', DATE '2026-06-22', 1850000, 'INSTALACION FUNDACIONES PATIO EXTERIOR - Cotización N.: 89'),
  ('6365', '8201010', '77272640-6', 'FACORO DEL SUR SPA', DATE '2026-06-19', 2612800, 'FUNDACIONES DE HORMIGON PARA USO CON MÓDULOS DE LA CHACRA'),
  ('6402', '8201010', '83472500-2', 'TATTERSALL MAQUINARIAS S.A.', DATE '2026-06-24', 6892408, 'ARRIENDO DE GRÚAS HORQUILLAS PARA PROYECTO LA CHACRA, JUNIO')
) AS v(numero_oc, codigo, rut, nombre, fecha, neto, detalle)
JOIN public.financiero_presupuestos p ON p.codigo_articulo = v.codigo
ON CONFLICT (numero_oc, presupuesto_id) DO NOTHING;

-- (2) Reclasificación (mismo monto, WIP equivocado)
UPDATE public.financiero_ordenes_compra oc
SET presupuesto_id = (SELECT id FROM public.financiero_presupuestos WHERE codigo_articulo = '100703')
WHERE oc.numero_oc = '6040'
  AND oc.presupuesto_id = (SELECT id FROM public.financiero_presupuestos WHERE codigo_articulo = '8201010');

UPDATE public.financiero_ordenes_compra oc
SET presupuesto_id = (SELECT id FROM public.financiero_presupuestos WHERE codigo_articulo = '8201010')
WHERE oc.numero_oc = '5788'
  AND oc.presupuesto_id = (SELECT id FROM public.financiero_presupuestos WHERE codigo_articulo = '3012516');

-- (3) Corrección de monto
UPDATE public.financiero_ordenes_compra
SET neto = 8746800
WHERE numero_oc = '5981';

-- (5) Backfill proveedor_rut + nombre_proveedor_raw en OC existentes
UPDATE public.financiero_ordenes_compra oc
SET proveedor_rut = v.rut, nombre_proveedor_raw = v.nombre
FROM (VALUES
  ('6051','100101','76751794-7','C Y D SPA'),
  ('5861','100101','76452392-K','EPS CHILE SPA'),
  ('5284','100101','76320186-4','TECNO FAST S.A.'),
  ('5332','100101','76320186-4','TECNO FAST S.A.'),
  ('5614','100101','76320186-4','TECNO FAST S.A.'),
  ('5655','100101','76320186-4','TECNO FAST S.A.'),
  ('5694','100101','76320186-4','TECNO FAST S.A.'),
  ('5728','100101','76320186-4','TECNO FAST S.A.'),
  ('5755','100101','76320186-4','TECNO FAST S.A.'),
  ('5789','100101','76320186-4','TECNO FAST S.A.'),
  ('5832','100101','76320186-4','TECNO FAST S.A.'),
  ('5886','100101','76320186-4','TECNO FAST S.A.'),
  ('5947','100101','76320186-4','TECNO FAST S.A.'),
  ('6000','100101','76320186-4','TECNO FAST S.A.'),
  ('6014','100101','76320186-4','TECNO FAST S.A.'),
  ('6045','100101','76320186-4','TECNO FAST S.A.'),
  ('6046','100101','76320186-4','TECNO FAST S.A.'),
  ('6076','100101','76320186-4','TECNO FAST S.A.'),
  ('6078','100101','76320186-4','TECNO FAST S.A.'),
  ('6079','100101','76320186-4','TECNO FAST S.A.'),
  ('6104','100101','76320186-4','TECNO FAST S.A.'),
  ('6116','100101','76320186-4','TECNO FAST S.A.'),
  ('6160','100101','76320186-4','TECNO FAST S.A.'),
  ('6161','100101','76320186-4','TECNO FAST S.A.'),
  ('6188','100101','76320186-4','TECNO FAST S.A.'),
  ('6215','100101','76320186-4','TECNO FAST S.A.'),
  ('6213','100101','76320186-4','TECNO FAST S.A.'),
  ('6237','100101','76320186-4','TECNO FAST S.A.'),
  ('6266','100101','76320186-4','TECNO FAST S.A.'),
  ('6231','100101','76751794-7','C Y D SPA'),
  ('6257','100101','76751794-7','C Y D SPA'),
  ('6267','100101','76130710-K','SOC COMERCIAL Y AISLANTES SUR POL LIMITADA'),
  ('6294','100101','76320186-4','TECNO FAST S.A.'),
  ('6310','100101','76320186-4','TECNO FAST S.A.'),
  ('6344','100101','76320186-4','TECNO FAST S.A.'),
  ('6403','100101','76320186-4','TECNO FAST S.A.'),
  ('6404','100101','76320186-4','TECNO FAST S.A.'),
  ('6405','100101','76320186-4','TECNO FAST S.A.'),
  ('5370','100703','79877600-2','PATRICIO DIAZ E HIJOS SPA'),
  ('5840','100703','78142744-6','CARPAS PUERTO MONTT SPA'),
  ('5829','200206','78188079-5','CONBES SPA'),
  ('5396','200307','76691453-5','COMERCIAL PDUARTE SPA'),
  ('5611','200307','76691453-5','COMERCIAL PDUARTE SPA'),
  ('5531','200408','96977750-9','INGENIERIA C.G. S.A.'),
  ('5531','200609','96977750-9','INGENIERIA C.G. S.A.'),
  ('5715','3012415','17030413-6','Jorge Martinez'),
  ('5476','8201010','76320186-4','TECNO FAST S.A.'),
  ('5640','8201010','76320186-4','TECNO FAST S.A.'),
  ('5849','8201010','83472500-2','TATTERSALL MAQUINARIAS S.A.'),
  ('5863','8201010','76821330-5','IMPERIAL S.A.'),
  ('5876','8201010','96977750-9','INGENIERIA C.G. S.A.'),
  ('5984','8201010','83472500-2','TATTERSALL MAQUINARIAS S.A.'),
  ('5946','8201010','76320186-4','TECNO FAST S.A.'),
  ('6034','8201010','76011325-5','COMERCIAL ROLLE S.A.'),
  ('6050','8201010','83472500-2','TATTERSALL MAQUINARIAS S.A.'),
  ('6048','8201010','76427363-K','SOCIEDAD POR ACCIONES DISTRIBUIDORA INDUSTRIAL CYNAPLUS SPA'),
  ('6173','8201010','77272640-6','FACORO DEL SUR SPA'),
  ('6209','8201010','83472500-2','TATTERSALL MAQUINARIAS S.A.'),
  ('5362','8204013','76320186-4','TECNO FAST S.A.'),
  ('5711','8204013','76320186-4','TECNO FAST S.A.'),
  ('5775','8204013','78524720-5','ARCHIPLAN PROYECTOS DE ARQUITECTURA SOCIEDAD ANONIMA')
) AS v(numero_oc, codigo, rut, nombre)
JOIN public.financiero_presupuestos p ON p.codigo_articulo = v.codigo
WHERE oc.numero_oc = v.numero_oc AND oc.presupuesto_id = p.id;

-- (6) Proveedor en Gastos Directos (para que el selector reusable aplique ahí también)
ALTER TABLE public.financiero_gastos_directos
  ADD COLUMN IF NOT EXISTS proveedor_rut text REFERENCES public.financiero_proveedores(rut);
