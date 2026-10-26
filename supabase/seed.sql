-- EmprendeRed · datos semilla
-- Ejecutar DESPUÉS de schema.sql. Es idempotente (no duplica ni borra calificaciones).
--
-- 15 perfiles FICTICIOS de la red (5 socios, 5 mentores, 5 inversionistas), marcados is_demo = true.
-- Nombres inventados: ninguno corresponde a los entrevistados del Hito 1 ni a personas reales.
-- Para reemplazarlos por personas reales: insertar los nuevos con is_demo = false y luego
--   update network_profiles set active = false where is_demo;
-- Tickets en CLP. Rubros, etapas y competencias usan las claves de src/lib/catalog.ts.

insert into network_profiles (id, kind, name, headline, bio, region, industries, stages, skills, ticket_min, ticket_max, is_demo) values
-- Socios
('00000000-0000-4000-8000-000000000001', 'socio', 'Camila Fuentes Rojas',
 'Ingeniera comercial · finanzas y ventas B2B',
 'Cinco años armando modelos de negocio y cerrando ventas a empresas. Busca sumarse como cofundadora a un proyecto con base técnica.',
 'Metropolitana', '{retail,tecnologia,agricola}', '{idea,validacion}', '{finanzas,comercial,levantamiento}', null, null, true),
('00000000-0000-4000-8000-000000000002', 'socio', 'Joaquín Valenzuela Soto',
 'Desarrollador full-stack · 6 años en startups',
 'Ha construido plataformas web y apps desde cero. Quiere asociarse con alguien que conozca bien al cliente y el negocio.',
 'Valparaíso', '{tecnologia,energia,retail}', '{idea,validacion,primeras_ventas}', '{software,producto}', null, null, true),
('00000000-0000-4000-8000-000000000003', 'socio', 'Fernanda Contreras Muñoz',
 'Ingeniera en minas · operaciones de faena',
 'Experiencia en planificación y operación de faenas en el norte. Interesada en proyectos que resuelvan problemas reales de la minería.',
 'Antofagasta', '{mineria,energia}', '{validacion,primeras_ventas}', '{tecnico_rubro,operaciones,gestion}', null, null, true),
('00000000-0000-4000-8000-000000000004', 'socio', 'Matías Herrera Lagos',
 'Ingeniero agrónomo · cadena de suministro agrícola',
 'Conoce la logística del campo a la góndola y tiene trato directo con productores del Maule.',
 'Maule', '{agricola,retail}', '{idea,validacion}', '{tecnico_rubro,operaciones,comercial}', null, null, true),
('00000000-0000-4000-8000-000000000005', 'socio', 'Valentina Araya Pizarro',
 'Marketing digital y growth para e-commerce',
 'Ha escalado tiendas online con campañas de pauta y contenido. Busca un proyecto donde liderar la adquisición de clientes.',
 'Biobío', '{retail,salud,tecnologia}', '{validacion,primeras_ventas}', '{marketing,comercial,producto}', null, null, true),
-- Mentores
('00000000-0000-4000-8000-000000000006', 'mentor', 'Rodrigo Salinas Vera',
 'Ex gerente de operaciones mineras · 20 años',
 'Mentorea a equipos jóvenes en validación técnica y en cómo presentar datos verificables a una faena.',
 'Antofagasta', '{mineria,energia,manufactura}', '{validacion,primeras_ventas}', '{tecnico_rubro,operaciones,gestion}', null, null, true),
('00000000-0000-4000-8000-000000000007', 'mentor', 'Patricia Morales Leiva',
 'Abogada corporativa · pactos de socios y estructuración',
 'Asesora en pactos de accionistas, vesting, cap table e instrumentos como SAFE y notas convertibles.',
 'Metropolitana', '{legal,tecnologia,retail,energia,salud}', '{idea,validacion,primeras_ventas}', '{legal,levantamiento}', null, null, true),
('00000000-0000-4000-8000-000000000008', 'mentor', 'Andrés Bravo Cifuentes',
 'Ex CFO de pyme · modelos financieros y fondos públicos',
 'Ayuda a pasar de la idea a un flujo de caja defendible y a preparar postulaciones a fondos concursables.',
 'Metropolitana', '{tecnologia,retail,agricola,manufactura,salud,construccion}', '{idea,validacion}', '{finanzas,levantamiento,gestion}', null, null, true),
('00000000-0000-4000-8000-000000000009', 'mentor', 'Carolina Espinoza Toro',
 'Ex jefa comercial en retail · canales y ventas',
 'Acompaña a emprendedores a definir su canal de venta, precio y primeros clientes.',
 'Valparaíso', '{retail,manufactura,salud}', '{idea,validacion,primeras_ventas}', '{comercial,marketing}', null, null, true),
('00000000-0000-4000-8000-000000000010', 'mentor', 'Ignacio Godoy Ramírez',
 'Ingeniero eléctrico · energías renovables y almacenamiento',
 'Mentor técnico para proyectos de energía: dimensionamiento, normativa y relación con distribuidoras.',
 'Biobío', '{energia,tecnologia}', '{idea,validacion}', '{tecnico_rubro,producto,gestion}', null, null, true),
-- Inversionistas
('00000000-0000-4000-8000-000000000011', 'inversionista', 'María José Riquelme Castro',
 'Inversionista ángel · ex ejecutiva de banca',
 'Invierte en proyectos con primeras ventas y números claros. Aporta red con bancos y proveedores.',
 'Metropolitana', '{tecnologia,retail,salud}', '{validacion,primeras_ventas}', '{finanzas,levantamiento}', 5000000, 20000000, true),
('00000000-0000-4000-8000-000000000012', 'inversionista', 'Gonzalo Ibarra Sepúlveda',
 'Family office agroindustrial',
 'Busca proyectos que mejoren la productividad del campo o la cadena de alimentos, aunque sean soluciones pequeñas.',
 'O''Higgins', '{agricola,manufactura}', '{validacion,primeras_ventas}', '{operaciones,comercial}', 10000000, 50000000, true),
('00000000-0000-4000-8000-000000000013', 'inversionista', 'Francisca Núñez Alarcón',
 'Inversionista ángel · minería y energía',
 'Ex gerenta de proyectos. Invierte en soluciones para faenas y energía con validación técnica.',
 'Antofagasta', '{mineria,energia}', '{validacion,primeras_ventas}', '{tecnico_rubro,levantamiento}', 15000000, 60000000, true),
('00000000-0000-4000-8000-000000000014', 'inversionista', 'Felipe Cárdenas Molina',
 'Fondo de capital semilla privado · tecnología',
 'Ticket semilla para software con tracción temprana. Pide métricas de uso, flujo proyectado y equipo complementario.',
 'Metropolitana', '{tecnologia,salud,retail}', '{validacion,primeras_ventas}', '{levantamiento,finanzas,producto}', 20000000, 80000000, true),
('00000000-0000-4000-8000-000000000015', 'inversionista', 'Javiera Olivares Reyes',
 'Inversionista de impacto · proyectos regionales',
 'Apoya emprendimientos fuera de Santiago desde la etapa de idea, con montos pequeños y acompañamiento.',
 'Los Lagos', '{agricola,energia,salud,otro}', '{idea,validacion}', '{gestion,levantamiento}', 3000000, 10000000, true)
on conflict (id) do nothing;

-- Configuración inicial (editable en /admin)
insert into settings (key, value) values
  ('target_n', '{"emprendedores": 10, "evaluadores": 10}'),
  ('min_n', '5')
on conflict (key) do nothing;
