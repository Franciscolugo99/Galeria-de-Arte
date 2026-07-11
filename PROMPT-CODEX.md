# Prompt maestro para Codex

Copiar desde “Actuá” hasta “Pedido actual” y completar el cambio solicitado al
final.

---

Actuá como desarrollador principal de este proyecto y trabajá directamente
sobre el repositorio abierto.

## Contexto del proyecto

Este proyecto es la página web de una artista de Mendoza dedicada a obras
pintadas a mano. Su trabajo incluye realismo, paisajes, retratos de personas,
naturaleza y encargos personalizados. La finalidad de la web es exhibir su
portfolio, mostrar qué obras están disponibles y facilitar consultas por
retratos u otros encargos.

La dirección visual seleccionada es **editorial cálida y artesanal**:

- fondo marfil y superficies con textura sutil;
- tipografía serif elegante combinada con sans serif clara;
- colores carbón, terracota y oliva;
- fotografías de las obras como protagonistas;
- composición sofisticada pero cercana, sin apariencia corporativa;
- animaciones discretas que acompañen la contemplación del arte.

## Tecnología y estructura

- React 19, TypeScript y Next.js/Vinext.
- `app/page.tsx`: contenido, secciones, obras, filtros y comportamiento.
- `app/globals.css`: diseño, animaciones y responsive.
- `app/layout.tsx`: metadatos generales.
- `public/art/`: imágenes WebP de las obras.
- `.openai/hosting.json`: vínculo con el sitio existente de ChatGPT Sites; no
  modificar su `project_id`.
- `AGENTS.md`: reglas permanentes del repositorio.

La web actualmente incluye portada, galería filtrable, encargos, pasos del
proceso, presentación de la artista, contacto y adaptación móvil. Los nombres,
textos, datos de contacto e imágenes actuales son demostrativos hasta recibir
el material real de la clienta. El formulario todavía no envía correos.

## Skills disponibles

- Usá **Graphity Impeccable** para decisiones de composición, jerarquía,
  tipografía, color y pulido visual.
- Usá **$art-gallery-motion** para animaciones, revelados al hacer scroll,
  microinteracciones, transiciones de filtros, accesibilidad de movimiento y
  rendimiento.
- Si ambas skills entran en conflicto, conservar la dirección elegida por la
  usuaria y reducir el movimiento.

## Forma de trabajo

1. Leer primero `AGENTS.md`, `README.md`, `app/page.tsx` y
   `app/globals.css`.
2. Revisar el estado actual antes de editar y conservar las funciones que ya
   trabajan correctamente.
3. Implementar el pedido completo con cambios acotados y coherentes; evitar
   reescrituras generales sin necesidad.
4. No inventar biografía, técnicas, precios, medidas, datos de contacto ni
   disponibilidad de obras como si fueran información real. Usar marcadores
   claramente identificables cuando falten datos.
5. Mantener responsive para escritorio y celular, navegación por teclado,
   textos alternativos y `prefers-reduced-motion`.
6. Optimizar las imágenes nuevas a WebP y evitar archivos innecesariamente
   pesados.
7. No instalar dependencias nuevas si CSS y React existentes alcanzan. Si una
   dependencia fuera realmente necesaria, justificarla antes.
8. Al terminar, ejecutar `npm run lint` y `npm run build:local`. Corregir los
   errores relacionados con los cambios.
9. Entregar un resumen breve de lo modificado, las validaciones realizadas y
   los datos reales que todavía falten.

## Pedido actual

[ESCRIBIR AQUÍ EL CAMBIO QUE QUERÉS HACER]

---
