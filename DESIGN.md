# Design

## Summary

Portfolio artístico de registro editorial cálido y artesanal. La experiencia
debe sentirse como una visita pausada a una galería pequeña: fondo marfil,
textura sutil, tipografía elegante, imágenes grandes y movimiento mínimo.

## Visual Theme

- Fondo principal marfil con variaciones papel y piedra.
- Tono general luminoso, cálido y contenido.
- La imagen de obra es el centro visual de cada sección.
- Evitar estética corporativa, SaaS, tienda genérica o plantilla de ecommerce.

## Color

Estrategia: restringida con acentos cálidos. La base usa neutros tintados y el
terracota aparece como acento de acción, orientación y estado.

Tokens actuales:

- `--ivory`: marfil principal en OKLCH.
- `--paper`: superficie papel clara.
- `--charcoal`: texto principal carbón.
- `--muted`: texto secundario cálido.
- `--terracotta`: acento principal para acciones y orientación.
- `--terracotta-dark`: acento activo.
- `--olive`: confirmaciones y matiz natural.
- `--stone`: soporte cálido para imágenes y bloques.
- `--warm-panel`: paneles de formulario, menú y cinta.
- `--portrait-mat`: fondo tipo paspartú para imagen secundaria.
- `--field-line`: líneas de formulario.
- `--footer-text`: texto secundario sobre carbón.
- `--line`: divisores suaves.

## Typography

- Display: `"Cormorant Garamond", "Iowan Old Style", Georgia, serif`.
- Body: `var(--font-geist-sans), Manrope, Inter, ui-sans-serif, system-ui`.
- Usar la serif para títulos grandes, marca y nombres de obra.
- Usar la sans para lectura, navegación, filtros, formularios y datos.
- Mantener jerarquía con escala amplia, aire y contraste de peso, no con exceso
  de adornos.

## Layout

- Portada en dos planos: texto editorial y obra principal con apoyo visual.
- Secciones amplias, con respiración generosa y ritmos variables.
- Galería en grilla asimétrica en escritorio, una columna legible en celular.
- Evitar tarjetas anidadas. Usar fichas solo donde realmente enmarcan una obra,
  un formulario o un bloque repetido.
- En mobile, priorizar lectura y obra completa por sobre composiciones densas.

## Components

- Header: marca tipográfica y navegación discreta.
- Menú móvil: panel claro, acceso rápido, cierre con botón y tecla Escape.
- Botones: rectangulares, radio mínimo, peso editorial.
- Filtros: controles tipo píldora sobrios, con `aria-pressed`.
- Obra: imagen, estado pequeño, categoría, título, técnica y medida.
- Formulario: demostrativo hasta conectar destino real, con mensaje honesto de
  confirmación local.

## Motion

Usar el sistema de `art-gallery-motion`:

- Revelados con `opacity` y `transform`, entre 500 y 850 ms.
- Controles entre 160 y 240 ms.
- Zoom de obra mínimo, entre `1.01` y `1.025`.
- Escalonado de grupos entre 50 y 90 ms.
- Sin animaciones infinitas, parallax de texto, partículas, cursores falsos ni
  scroll secuestrado.
- Respetar `prefers-reduced-motion`.

## Content Rules

- Español rioplatense, profesional cercano.
- No inventar biografía, precios, medidas, técnicas, plazos ni contacto.
- Usar “A definir” o mensajes explícitos cuando un dato todavía sea provisorio.
- Alt texts descriptivos, naturales y centrados en la obra.

## Responsive

- Desktop: composición editorial, grilla con asimetría y obras amplias.
- Tablet: mantener dos columnas cuando la imagen conserve protagonismo.
- Mobile: menú accesible, una columna, botones de ancho completo cuando ayuden,
  títulos ajustados y filtros desplazables sin romper la navegación.
