# Recetas de movimiento

## Tokens CSS

```css
:root {
  --motion-fast: 180ms;
  --motion-medium: 560ms;
  --motion-slow: 780ms;
  --motion-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

## Revelado progresivo

Mantener el contenido visible por defecto. Agregar la clase `motion-ready` en
el cliente solamente cuando el observador esté activo.

```css
.motion-ready [data-reveal] {
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity var(--motion-slow) var(--motion-ease-out),
    transform var(--motion-slow) var(--motion-ease-out);
}

.motion-ready [data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .motion-ready [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

## Observer React reutilizable

```tsx
import { useEffect } from "react";

export function useArtworkReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (!("IntersectionObserver" in window)) return;

    root.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8%" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      root.classList.remove("motion-ready");
    };
  }, []);
}
```

## Hover de obra

```css
.artwork img {
  transform: scale(1);
  transition: transform 700ms var(--motion-ease-out);
}

.artwork:hover img,
.artwork:focus-within img {
  transform: scale(1.018);
}
```

## Cambio de filtros

Mantener el contenedor estable. Aplicar una salida corta, reemplazar el grupo y
realizar una entrada un poco más lenta:

```css
.gallery-grid {
  transition: opacity var(--motion-fast) ease-out;
}

.gallery-grid.is-changing {
  opacity: 0.18;
}
```

No agregar retrasos individuales a una cuadrícula grande. Escalonar únicamente
las primeras obras visibles.
