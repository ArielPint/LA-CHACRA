# La Chacra — Sistema de Gestión Interna

Panel web de gestión para La Chacra. Permite administrar producción, solicitudes de materiales, pedidos, asistencia, compras y control de planta desde una interfaz centralizada con autenticación por roles.

## Módulos

| Módulo | Archivo |
|---|---|
| Portal principal | `tecnopanel.html` |
| Producción | `produccion.html` |
| Solicitudes de materiales | `solicitudes.html` |
| Pedidos | `pedidos.html` |
| Asistencia | `asistencia.html` |
| Control de planta | `control-planta.html` |
| Compras | `compras.html` |
| Administración de usuarios | `admin.html` |

## Tecnología

- HTML/CSS/JS puro (sin frameworks)
- Autenticación basada en roles vía `auth.js`
- Datos persistidos en `localStorage`
- Tema oscuro con CSS variables

## Inicio rápido

Abrí `index.html` en un navegador (redirige automáticamente a `tecnopanel.html`) o servilo con cualquier servidor estático.
