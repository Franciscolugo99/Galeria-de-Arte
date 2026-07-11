# Galería de arte realista

Sitio web de portfolio artístico creado con React, Next.js/Vinext y TypeScript.
Está preparado para editarse localmente con VS Code, Codex u otro agente de IA.

## Requisitos

- Node.js 22.13 o superior
- npm (incluido con Node.js)
- Git, si se va a sincronizar con GitHub

## Ejecutar en Windows

1. Descomprimir el proyecto.
2. Abrir la carpeta en VS Code.
3. Abrir PowerShell dentro de esa carpeta.
4. Ejecutar:

```powershell
npm install
npm run dev:local
```

5. Abrir la dirección que indique la terminal, normalmente
   `http://localhost:5173`.

Para detener la web local, presionar `Ctrl + C` en la terminal.

## Archivos principales

- `app/page.tsx`: textos, secciones, obras y comportamiento de la página.
- `app/globals.css`: colores, tipografías, tamaños y diseño responsive.
- `app/layout.tsx`: título y descripción para buscadores.
- `public/art/`: imágenes de las obras.
- `AGENTS.md`: instrucciones para un agente de IA que trabaje en el proyecto.
- `PROMPT-CODEX.md`: prompt maestro listo para iniciar una tarea nueva.
- `.agents/skills/art-gallery-motion/`: skill de animaciones artísticas.

## Cambiar las obras

1. Copiar las imágenes optimizadas a `public/art/`.
2. Abrir `app/page.tsx`.
3. Modificar la lista `works` con el título, categoría, archivo, técnica,
   tamaño y estado de cada obra.

Conviene usar imágenes `.webp` y evitar archivos demasiado pesados.

## Crear el repositorio Git local

```powershell
git init
git add .
git commit -m "Sitio inicial de galería de arte"
git branch -M main
```

Después de crear un repositorio vacío en GitHub:

```powershell
git remote add origin https://github.com/TU-USUARIO/NOMBRE-DEL-REPO.git
git push -u origin main
```

## Comandos útiles

```powershell
npm run dev:local
npm run lint
npm run build:local
```

## Vinculación con ChatGPT Sites

La carpeta `.openai/` conserva la identidad del sitio que ya está publicado en
ChatGPT Sites. No contiene la contraseña de tu cuenta. Conservála si querés que
un agente compatible pueda reconocer y actualizar el mismo sitio.

Si el repositorio va a utilizarse como un proyecto completamente independiente,
se puede retirar esa carpeta antes de publicarlo en GitHub.
