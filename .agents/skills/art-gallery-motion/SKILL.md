---
name: art-gallery-motion
description: Diseñar, implementar y revisar sistemas de movimiento sutiles para portfolios de artistas y galerías web. Usar cuando Codex deba animar apariciones al hacer scroll, cambios de categoría, ampliaciones de obras, estados hover/focus, navegación, transiciones de página o microinteracciones en una experiencia centrada en arte; también cuando deba corregir animaciones excesivas, inaccesibles, lentas o inconsistentes. Complementa skills de diseño visual como Graphity Impeccable y se concentra en coreografía, accesibilidad y rendimiento.
---

# Art Gallery Motion

Crear movimiento editorial que acompañe la contemplación de las obras sin
competir con ellas. Mantener la composición estática definida por el usuario o
por la skill visual y usar esta skill para decidir ritmo, secuencia y respuesta.

## Flujo de trabajo

1. Leer `AGENTS.md`, la estructura del frontend y los estilos existentes.
2. Identificar una intención concreta para cada animación: orientar, revelar,
   confirmar una acción o mostrar continuidad.
3. Eliminar cualquier movimiento que no cumpla una de esas funciones.
4. Proponer una coreografía corta antes de tocar el código.
5. Implementar primero con CSS. Incorporar una librería de animación solamente
   si ya está instalada o si el usuario autoriza la nueva dependencia.
6. Revisar escritorio, celular, teclado y `prefers-reduced-motion`.
7. Ejecutar las validaciones existentes del proyecto y resumir lo realizado.

## Lenguaje de movimiento

- Usar `opacity` y `transform` como propiedades principales.
- Usar 160–240 ms para botones, enlaces, filtros y estados de foco.
- Usar 500–850 ms para apariciones editoriales de secciones u obras.
- Preferir `cubic-bezier(0.22, 1, 0.36, 1)` para revelados y `ease-out` para
  controles.
- Limitar desplazamientos de entrada a 12–24 px.
- Limitar zoom de obras a `1.01–1.025`.
- Escalonar elementos relacionados entre 50 y 90 ms, con un máximo visible de
  seis elementos por secuencia.
- Ejecutar los revelados una sola vez salvo que la repetición comunique un
  cambio real de estado.

## Coreografías recomendadas

- **Portada:** revelar primero la obra principal y luego título, descripción y
  acciones. Mantener el retraso total por debajo de 500 ms.
- **Galería:** usar aparición suave en grupos y una transición breve al cambiar
  el filtro. Conservar el tamaño de la cuadrícula para evitar saltos.
- **Obras:** aplicar zoom mínimo y cambio sutil de ficha en hover/focus. No
  inclinar ni deformar la pintura.
- **Encargos:** revelar los pasos en orden de lectura, sin animación continua.
- **Navegación:** usar subrayado o variación de color. Evitar menús que retrasen
  el acceso al contenido.
- **Formulario:** confirmar foco, error y envío con cambios rápidos y claros.

## Límites

- No usar animaciones infinitas, cursores falsos, partículas decorativas,
  desplazamientos agresivos, sonidos automáticos ni scroll secuestrado.
- No aplicar parallax a texto ni a controles. Usarlo sobre imágenes únicamente
  si es muy leve, no afecta la lectura y queda desactivado en móvil.
- No animar propiedades que provoquen reflow si puede resolverse con
  `transform`.
- No ocultar contenido esencial esperando JavaScript; la página debe conservar
  una lectura válida si la animación falla.
- No aumentar el tiempo de carga inicial para agregar efectos secundarios.

## Accesibilidad y rendimiento

- Proveer una variante sin desplazamientos ni escalas con
  `prefers-reduced-motion: reduce`.
- Mantener visibles los estados `:focus-visible` y equivalentes de teclado.
- Evitar cambios de layout y reservar el espacio de imágenes antes de cargar.
- Usar `IntersectionObserver` compartido y limpiar observadores al desmontar.
- Pausar o desactivar movimiento fuera de pantalla.
- Verificar que filtros y menús sigan funcionando sin depender del hover.

## Relación con Graphity Impeccable

Usar Graphity Impeccable para composición, tipografía, jerarquía, color y
acabado visual. Usar Art Gallery Motion para transformar esa dirección en un
sistema temporal coherente. Si ambas indicaciones entran en conflicto,
preservar el diseño seleccionado por el usuario y reducir el movimiento.

## Recursos

Leer [references/motion-recipes.md](references/motion-recipes.md) solamente
cuando hagan falta patrones CSS o React listos para adaptar.
