-- Migración de usuarios existentes desde users.json a Supabase Auth
-- Contraseña temporal para TODOS los usuarios: LaChacra2024!
-- El admin debe resetear las contraseñas tras la migración.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── auth.users ──────────────────────────────────────────────────────────────

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
VALUES
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','admin@lachacra.internal',       crypt('LaChacra2024!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{}','2026-06-10T00:00:00Z',NOW(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','636febe4-c524-4acd-bf27-b8beb6d5e1d5','authenticated','authenticated','dampuero@lachacra.internal',    crypt('LaChacra2024!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{}','2026-06-10T00:00:00Z',NOW(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','0aebd29d-b6d6-4e3b-b014-b151f9751c45','authenticated','authenticated','eseguel@lachacra.internal',     crypt('LaChacra2024!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{}','2026-06-10T00:00:00Z',NOW(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','55575ab8-63a8-4d2c-86e7-6b020558208f','authenticated','authenticated','fetchegaray@lachacra.internal', crypt('LaChacra2024!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{}','2026-06-10T00:00:00Z',NOW(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','f016416c-71c4-4519-b6f2-334f3edeac33','authenticated','authenticated','vpinto@lachacra.internal',      crypt('LaChacra2024!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{}','2026-06-10T00:00:00Z',NOW(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','8c2ea023-bd59-4314-86e8-dafccfe506fa','authenticated','authenticated','sscholl@lachacra.internal',     crypt('LaChacra2024!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{}','2026-06-10T00:00:00Z',NOW(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','3b264db7-0e8e-4278-870a-1aeb8deec2ca','authenticated','authenticated','jmartinez@lachacra.internal',   crypt('LaChacra2024!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{}','2026-06-10T00:00:00Z',NOW(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','348bb02e-b93d-4b9e-85f0-e4bafe0e850e','authenticated','authenticated','jolivos@lachacra.internal',     crypt('LaChacra2024!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{}','2026-06-10T00:00:00Z',NOW(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','854c693b-a3a7-459d-82a6-0965f1a211d0','authenticated','authenticated','bvalenzuela@lachacra.internal', crypt('LaChacra2024!',gen_salt('bf')),NOW(),'{"provider":"email","providers":["email"]}','{}','2026-06-10T00:00:00Z',NOW(),'','','','');

-- ── auth.identities (necesario para login por email) ───────────────────────

INSERT INTO auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001','admin@lachacra.internal',       '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@lachacra.internal","email_verified":true}'::jsonb,       'email',NOW(),NOW(),NOW()),
  ('636febe4-c524-4acd-bf27-b8beb6d5e1d5','dampuero@lachacra.internal',    '{"sub":"636febe4-c524-4acd-bf27-b8beb6d5e1d5","email":"dampuero@lachacra.internal","email_verified":true}'::jsonb,    'email',NOW(),NOW(),NOW()),
  ('0aebd29d-b6d6-4e3b-b014-b151f9751c45','eseguel@lachacra.internal',     '{"sub":"0aebd29d-b6d6-4e3b-b014-b151f9751c45","email":"eseguel@lachacra.internal","email_verified":true}'::jsonb,     'email',NOW(),NOW(),NOW()),
  ('55575ab8-63a8-4d2c-86e7-6b020558208f','fetchegaray@lachacra.internal', '{"sub":"55575ab8-63a8-4d2c-86e7-6b020558208f","email":"fetchegaray@lachacra.internal","email_verified":true}'::jsonb, 'email',NOW(),NOW(),NOW()),
  ('f016416c-71c4-4519-b6f2-334f3edeac33','vpinto@lachacra.internal',      '{"sub":"f016416c-71c4-4519-b6f2-334f3edeac33","email":"vpinto@lachacra.internal","email_verified":true}'::jsonb,      'email',NOW(),NOW(),NOW()),
  ('8c2ea023-bd59-4314-86e8-dafccfe506fa','sscholl@lachacra.internal',     '{"sub":"8c2ea023-bd59-4314-86e8-dafccfe506fa","email":"sscholl@lachacra.internal","email_verified":true}'::jsonb,     'email',NOW(),NOW(),NOW()),
  ('3b264db7-0e8e-4278-870a-1aeb8deec2ca','jmartinez@lachacra.internal',   '{"sub":"3b264db7-0e8e-4278-870a-1aeb8deec2ca","email":"jmartinez@lachacra.internal","email_verified":true}'::jsonb,   'email',NOW(),NOW(),NOW()),
  ('348bb02e-b93d-4b9e-85f0-e4bafe0e850e','jolivos@lachacra.internal',     '{"sub":"348bb02e-b93d-4b9e-85f0-e4bafe0e850e","email":"jolivos@lachacra.internal","email_verified":true}'::jsonb,     'email',NOW(),NOW(),NOW()),
  ('854c693b-a3a7-459d-82a6-0965f1a211d0','bvalenzuela@lachacra.internal', '{"sub":"854c693b-a3a7-459d-82a6-0965f1a211d0","email":"bvalenzuela@lachacra.internal","email_verified":true}'::jsonb, 'email',NOW(),NOW(),NOW());

-- ── user_profiles (permisos y roles completos desde users.json) ────────────

INSERT INTO public.user_profiles (id, username, name, email, role, active, permissions, planta_rol, created_at, updated_at)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'admin', 'Ariel', 'ariel.pinto.a@gmail.com', 'admin', true,
  '{"pages":{"dashboard":{"access":true,"tabs":["resumen","curva","modulos","compras","productos","stock","despachos","prod-diaria"]},"produccion":{"access":true,"tabs":["resumen","torres","partidas","alertas","detalle"]},"layout":{"access":true,"tabs":["resumen","galpon","carpa-grande","carpa-chica","patio","planta"]},"despacho":{"access":true,"tabs":[]},"solicitudes":{"access":true,"tabs":["nueva","historial"]},"planta":{"access":true,"tabs":["obra_gruesa","sanitario","electrico","terminaciones","recepcion"]},"geovictoria":{"access":true,"tabs":[]}},"readonly":false,"canEditLayout":true,"canEditProducts":true}'::jsonb,
  'gerente',
  '2026-06-10T00:00:00Z', NOW()
),
(
  '636febe4-c524-4acd-bf27-b8beb6d5e1d5',
  'dampuero', 'Daniela Ampuero', 'dampuero@tecnopanel.cl', 'operador', true,
  '{"pages":{"dashboard":{"access":true,"tabs":["resumen","curva","modulos","compras","productos","stock","despachos"]},"produccion":{"access":true,"tabs":["resumen","torres","partidas","alertas","detalle"]},"layout":{"access":true,"tabs":["resumen","galpon","carpa-grande","carpa-chica","patio","planta"]},"despacho":{"access":true,"tabs":[]},"solicitudes":{"access":true,"tabs":["historial"]},"planta":{"access":true,"tabs":["obra_gruesa","terminaciones","recepcion","sanitario","electrico"]},"geovictoria":{"access":false,"tabs":[]}},"readonly":false,"canEditLayout":false,"canEditProducts":true}'::jsonb,
  'supervisor_terminaciones',
  '2026-06-10T00:00:00Z', NOW()
),
(
  '0aebd29d-b6d6-4e3b-b014-b151f9751c45',
  'eseguel', 'Esteban Seguel', 'eseguel@tecnopanel.cl', 'operador', true,
  '{"pages":{"dashboard":{"access":true,"tabs":["resumen","curva","modulos","compras","productos","stock","despachos"]},"produccion":{"access":true,"tabs":["resumen","torres","partidas","alertas","detalle"]},"layout":{"access":true,"tabs":["resumen","galpon","carpa-grande","carpa-chica","patio","planta"]},"despacho":{"access":false,"tabs":[]},"solicitudes":{"access":false,"tabs":[]},"planta":{"access":true,"tabs":["obra_gruesa","sanitario","electrico","terminaciones","recepcion"]},"geovictoria":{"access":false,"tabs":[]}},"readonly":false,"canEditLayout":false,"canEditProducts":false,"planta_marks":{"obra_gruesa":["cliente"],"sanitario":["cliente"],"electrico":["cliente"],"terminaciones":["cliente"],"recepcion":["entregado"]}}'::jsonb,
  'qc2',
  '2026-06-10T00:00:00Z', NOW()
),
(
  '55575ab8-63a8-4d2c-86e7-6b020558208f',
  'fetchegaray', 'Felipe Etchegaray', '', 'operador', true,
  '{"pages":{"dashboard":{"access":true,"tabs":["resumen","curva","modulos","compras","productos","stock","despachos"]},"produccion":{"access":true,"tabs":["resumen","torres","partidas","alertas","detalle"]},"layout":{"access":true,"tabs":["resumen","galpon","carpa-grande","carpa-chica","patio","planta"]},"despacho":{"access":false,"tabs":[]},"solicitudes":{"access":false,"tabs":[]},"planta":{"access":true,"tabs":["obra_gruesa","terminaciones","recepcion","sanitario","electrico"]},"geovictoria":{"access":false,"tabs":[]}},"readonly":false,"canEditLayout":false,"canEditProducts":false}'::jsonb,
  NULL,
  '2026-06-10T00:00:00Z', NOW()
),
(
  'f016416c-71c4-4519-b6f2-334f3edeac33',
  'vpinto', 'Vicente Pinto', 'vpinto@tecnopanel.cl', 'operador', true,
  '{"pages":{"dashboard":{"access":true,"tabs":["resumen","curva","modulos","compras","productos","stock","despachos"]},"produccion":{"access":true,"tabs":["resumen","torres","partidas","alertas","detalle"]},"layout":{"access":true,"tabs":["resumen","galpon","carpa-grande","carpa-chica","patio","planta"]},"despacho":{"access":true,"tabs":[]},"solicitudes":{"access":true,"tabs":["historial"]},"planta":{"access":true,"tabs":["obra_gruesa","terminaciones","recepcion","sanitario","electrico"]},"geovictoria":{"access":false,"tabs":[]}},"readonly":false,"canEditLayout":true,"canEditProducts":false}'::jsonb,
  'supervisor_recepcion',
  '2026-06-10T00:00:00Z', NOW()
),
(
  '8c2ea023-bd59-4314-86e8-dafccfe506fa',
  'sscholl', 'Santiago Scholl', 'sscholl@tecnopanel.cl', 'operador', true,
  '{"pages":{"dashboard":{"access":true,"tabs":["resumen","curva","modulos","compras","productos","stock","despachos"]},"produccion":{"access":true,"tabs":["resumen","torres","partidas","alertas","detalle"]},"layout":{"access":true,"tabs":["resumen","galpon","carpa-grande","carpa-chica","patio","planta"]},"despacho":{"access":true,"tabs":[]},"solicitudes":{"access":true,"tabs":[]},"planta":{"access":true,"tabs":["obra_gruesa","terminaciones","recepcion","sanitario","electrico"]},"geovictoria":{"access":false,"tabs":[]}},"readonly":false,"canEditLayout":true,"canEditProducts":false}'::jsonb,
  'supervisor_recepcion',
  '2026-06-10T00:00:00Z', NOW()
),
(
  '3b264db7-0e8e-4278-870a-1aeb8deec2ca',
  'jmartinez', 'Jorge Martinez', 'jmartinez@tecnofast.cl', 'operador', true,
  '{"pages":{"dashboard":{"access":true,"tabs":["resumen","curva","modulos","compras","productos","stock","despachos"]},"produccion":{"access":true,"tabs":["resumen","torres","partidas","alertas","detalle"]},"layout":{"access":true,"tabs":["resumen","galpon","carpa-grande","carpa-chica","patio","planta"]},"despacho":{"access":false,"tabs":[]},"solicitudes":{"access":false,"tabs":[]},"planta":{"access":true,"tabs":["obra_gruesa","terminaciones","recepcion","sanitario","electrico"]},"geovictoria":{"access":false,"tabs":[]}},"readonly":false,"canEditLayout":false,"canEditProducts":false}'::jsonb,
  'supervisor_recepcion',
  '2026-06-10T00:00:00Z', NOW()
),
(
  '348bb02e-b93d-4b9e-85f0-e4bafe0e850e',
  'jolivos', 'Javiera Olivos', 'jolivos@tecnopanel.cl', 'operador', true,
  '{"pages":{"dashboard":{"access":true,"tabs":["resumen","curva","modulos","compras","productos","stock","despachos"]},"produccion":{"access":true,"tabs":["resumen","torres","partidas","alertas","detalle"]},"layout":{"access":true,"tabs":["resumen","galpon","carpa-grande","carpa-chica","patio","planta"]},"despacho":{"access":false,"tabs":[]},"solicitudes":{"access":false,"tabs":[]},"planta":{"access":true,"tabs":["obra_gruesa","sanitario","electrico","terminaciones","recepcion"]},"geovictoria":{"access":false,"tabs":[]}},"readonly":false,"canEditLayout":false,"canEditProducts":false,"planta_marks":{"obra_gruesa":["cliente"],"sanitario":["cliente"],"electrico":["cliente"],"terminaciones":["cliente"]}}'::jsonb,
  'supervisor_recepcion',
  '2026-06-10T00:00:00Z', NOW()
),
(
  '854c693b-a3a7-459d-82a6-0965f1a211d0',
  'bvalenzuela', 'Catalina Valenzuela', 'bvalenzuela@tecnopanel.cl', 'operador', true,
  '{"pages":{"dashboard":{"access":false,"tabs":[]},"produccion":{"access":false,"tabs":[]},"layout":{"access":true,"tabs":["resumen","galpon","carpa-grande","carpa-chica","patio","planta"]},"despacho":{"access":false,"tabs":[]},"solicitudes":{"access":true,"tabs":["nueva","historial"]},"planta":{"access":true,"tabs":["obra_gruesa","sanitario","electrico","terminaciones","recepcion"]},"geovictoria":{"access":false,"tabs":[]}},"readonly":false,"canEditLayout":true,"canEditProducts":false,"planta_marks":{"obra_gruesa":["produccion"],"sanitario":["produccion"],"electrico":["produccion"],"terminaciones":["produccion"]}}'::jsonb,
  'supervisor_obra_gruesa',
  '2026-06-10T00:00:00Z', NOW()
);
