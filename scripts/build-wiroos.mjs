import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import react from "@vitejs/plugin-react";
import { build, createServer } from "vite";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, ".wiroos-release");
const clientDir = path.join(outputDir, "assets-build");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const server = await createServer({
  configFile: false,
  root: projectRoot,
  appType: "custom",
  server: { middlewareMode: true },
  plugins: [react()],
});

let renderedHome;
try {
  const pageModule = await server.ssrLoadModule("/app/page.tsx");
  renderedHome = renderToString(React.createElement(pageModule.default));
} finally {
  await server.close();
}

await build({
  configFile: false,
  root: projectRoot,
  base: "/",
  plugins: [react()],
  build: {
    outDir: clientDir,
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: path.join(projectRoot, "build/wiroos-entry.tsx") },
  },
});

const manifest = JSON.parse(
  await readFile(path.join(clientDir, ".vite", "manifest.json"), "utf8"),
);
const entry = Object.values(manifest).find((item) => item.isEntry);
if (!entry?.file) {
  throw new Error("No se encontró el archivo principal de la compilación.");
}

const cssLinks = (entry.css || [])
  .map((file) => `    <link rel="stylesheet" href="/${file}">`)
  .join("\n");
const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Obras originales, paisajes y retratos realistas pintados a mano en Mendoza, Argentina.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&amp;family=Manrope:wght@400;500;600;700&amp;display=swap">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <title>Carina Donaire | Pintura realista y retratos</title>
${cssLinks}
</head>
<body>
  <div id="root">${renderedHome}</div>
  <script type="module" src="/${entry.file}"></script>
</body>
</html>
`;
await writeFile(path.join(outputDir, "index.html"), html, "utf8");

await cp(path.join(clientDir, "assets"), path.join(outputDir, "assets"), { recursive: true });
await rm(clientDir, { recursive: true, force: true });

for (const directory of ["admin", "api"]) {
  await cp(path.join(projectRoot, directory), path.join(outputDir, directory), {
    recursive: true,
    filter: (source) => !source.endsWith("config.local.php"),
  });
}

for (const directory of ["art", "data"]) {
  await cp(
    path.join(projectRoot, "public", directory),
    path.join(outputDir, directory),
    { recursive: true },
  );
}
await cp(
  path.join(projectRoot, "public", "favicon.svg"),
  path.join(outputDir, "favicon.svg"),
);

await mkdir(path.join(outputDir, "public", "art"), { recursive: true });
await cp(
  path.join(projectRoot, "public", "art"),
  path.join(outputDir, "public", "art"),
  { recursive: true },
);
await cp(
  path.join(projectRoot, "public", "favicon.svg"),
  path.join(outputDir, "public", "favicon.svg"),
);

for (const directory of ["works", "profile"]) {
  const source = path.join(projectRoot, "public", "uploads", directory);
  const destination = path.join(outputDir, "uploads", directory);
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
}

await mkdir(path.join(outputDir, "storage", "originals"), { recursive: true });
await cp(
  path.join(projectRoot, "storage", ".htaccess"),
  path.join(outputDir, "storage", ".htaccess"),
);
await cp(
  path.join(projectRoot, "storage", "originals"),
  path.join(outputDir, "storage", "originals"),
  { recursive: true, force: true },
).catch(() => {});

await writeFile(
  path.join(outputDir, ".htaccess"),
  `Options -Indexes
DirectoryIndex index.html index.php
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>
<FilesMatch "^(\\.install-token|\\.env.*|config\\.local\\.php)$">
  Require all denied
</FilesMatch>
`,
  "utf8",
);
await writeFile(
  path.join(outputDir, ".user.ini"),
  `upload_max_filesize=40M
post_max_size=40M
memory_limit=512M
max_file_uploads=20
`,
  "utf8",
);

console.log(`Paquete Wiroos creado en ${outputDir}`);
