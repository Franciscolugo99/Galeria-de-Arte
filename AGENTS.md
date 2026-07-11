# Guía para agentes de IA

## Objetivo

Mantener una web elegante para una artista especializada en pintura realista,
paisajes y retratos por encargo.

## Dirección visual

- Estética editorial cálida y artesanal.
- Paleta marfil, carbón, terracota y oliva.
- Las obras deben ser las protagonistas.
- Evitar una apariencia de plantilla corporativa o tienda genérica.
- Mantener una experiencia clara en escritorio y celular.

## Mapa del proyecto

- `app/page.tsx`: contenido y componentes de la página principal.
- `app/globals.css`: sistema visual y comportamiento responsive.
- `app/layout.tsx`: metadatos y configuración general.
- `public/art/`: recursos visuales.
- `.openai/hosting.json`: vínculo opcional con el sitio existente.
- `PROMPT-CODEX.md`: contexto maestro para nuevas conversaciones con Codex.
- `.agents/skills/art-gallery-motion/`: sistema de animación para portfolios
  artísticos.

## Skills

- Usar Graphity Impeccable para composición, tipografía, color y acabado.
- Usar `art-gallery-motion` para revelados, hover, transiciones, accesibilidad
  de movimiento y rendimiento.

## Reglas de trabajo

- No modificar el `project_id` de `.openai/hosting.json`.
- No incluir credenciales, claves ni datos privados en el repositorio.
- Mantener textos en español rioplatense y tono profesional cercano.
- Optimizar las nuevas imágenes a WebP antes de agregarlas.
- Conservar etiquetas alternativas descriptivas para accesibilidad.
- No romper los filtros de categorías ni el menú móvil.
- El formulario actual es demostrativo hasta conectar un destino real.

## Validación

Después de cambios relevantes, ejecutar:

```bash
npm run lint
npm run build:local
```
