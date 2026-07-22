<?php
declare(strict_types=1);

$requestUri = (string) ($_SERVER['REQUEST_URI'] ?? '');
$requestPath = parse_url($requestUri, PHP_URL_PATH);
if (is_string($requestPath) && str_ends_with($requestPath, '/admin')) {
    $query = parse_url($requestUri, PHP_URL_QUERY);
    header('Location: ' . $requestPath . '/' . (is_string($query) && $query !== '' ? '?' . $query : ''), true, 308);
    exit;
}

require dirname(__DIR__) . '/api/bootstrap.php';

$user = current_user();
$userCount = (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
$boot = [
    'authenticated' => $user !== null,
    'needsSetup' => $userCount === 0,
    'user' => $user,
    'csrf' => csrf_token(),
    'apiBase' => '../api',
];
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <link rel="icon" type="image/svg+xml" href="../public/favicon.svg?v=20260713-1">
  <title>Administración de obras</title>
  <link rel="stylesheet" href="admin.css?v=20260722-1">
</head>
<body>
  <a class="skip-link" href="#contenido">Saltar al contenido</a>

  <section class="access-shell" id="accessView"<?= $user ? ' hidden' : '' ?>>
    <div class="access-art" aria-hidden="true">
      <span>Archivo de obra</span>
    </div>
    <div class="access-panel">
      <p class="wordmark">Carina Donaire</p>
      <div class="access-copy">
        <p class="eyebrow" id="accessEyebrow"><?= $userCount === 0 ? 'Primer ingreso' : 'Acceso privado' ?></p>
        <h1 id="accessTitle"><?= $userCount === 0 ? 'Creá tu acceso privado' : 'Volvé a tu catálogo' ?></h1>
        <p id="accessDescription">
          <?= $userCount === 0
              ? 'Este paso se realiza una sola vez. Elegí el correo y la contraseña que vas a usar para administrar tus obras.'
              : 'Ingresá con el correo autorizado para agregar, editar y publicar obras.' ?>
        </p>
      </div>
      <form class="access-form" id="accessForm" novalidate>
        <label id="nameField"<?= $userCount === 0 ? '' : ' hidden' ?>>
          Tu nombre
          <input name="displayName" autocomplete="name" value="Artista">
        </label>
        <label>
          Correo
          <input name="email" type="email" autocomplete="username" placeholder="admin@tudominio.com" required>
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autocomplete="current-password" minlength="10" required>
          <small>Mínimo 10 caracteres.</small>
        </label>
        <p class="form-message" id="accessMessage" role="status"></p>
        <button class="button primary" type="submit" id="accessSubmit">
          <?= $userCount === 0 ? 'Crear acceso' : 'Ingresar' ?>
        </button>
      </form>
      <p class="access-note">Área privada. Tus datos no se comparten con visitantes.</p>
    </div>
  </section>

  <div class="admin-shell" id="adminView"<?= $user ? '' : ' hidden' ?>>
    <aside class="sidebar" id="sidebar">
      <div>
        <p class="wordmark">Carina Donaire</p>
        <p class="sidebar-caption">Artista independiente</p>
      </div>
      <nav aria-label="Administración">
        <a class="active" href="#catalogo" aria-current="page" data-admin-view="works">
          <span aria-hidden="true">01</span> Obras
        </a>
        <a href="#categorias" data-admin-view="categories">
          <span aria-hidden="true">02</span> Categorías
        </a>
        <a href="#estudio" data-admin-view="settings">
          <span aria-hidden="true">03</span> Datos de la artista
        </a>
      </nav>
      <div class="sidebar-footer">
        <a href="../" id="publicSiteLink" target="_blank" rel="noreferrer">Ver sitio público <span aria-hidden="true">↗</span></a>
        <button type="button" id="logoutButton">Cerrar sesión</button>
      </div>
    </aside>
    <button class="sidebar-backdrop" id="sidebarBackdrop" type="button" aria-label="Cerrar menú" tabindex="-1"></button>

    <main id="contenido">
      <header class="topbar">
        <button class="menu-toggle" id="menuToggle" type="button" aria-controls="sidebar" aria-expanded="false">
          <span></span><span></span><span class="sr-only">Abrir menú</span>
        </button>
        <div>
          <p class="eyebrow" id="topbarEyebrow">Catálogo</p>
          <h1 id="topbarTitle">Obras</h1>
        </div>
        <button class="button primary" type="button" id="newWorkButton">Agregar obra</button>
      </header>

      <section class="catalog-view" id="catalogView">
        <div class="summary" aria-label="Resumen del catálogo">
          <p><strong id="totalCount">0</strong><span>Obras</span></p>
          <p><strong id="publishedCount">0</strong><span>Publicadas</span></p>
          <p><strong id="draftCount">0</strong><span>Borradores</span></p>
        </div>

        <section class="storage-usage" id="storageUsage" aria-labelledby="storageTitle" aria-describedby="storageDetail">
          <div class="storage-heading">
            <div>
              <h2 id="storageTitle">Almacenamiento de imágenes</h2>
              <p id="storageDetail">Calculando el espacio utilizado…</p>
            </div>
            <strong id="storagePercentage" aria-hidden="true">0%</strong>
          </div>
          <progress id="storageProgress" max="100" value="0" aria-label="Porcentaje de almacenamiento utilizado">0%</progress>
          <p class="storage-note">Incluye originales y versiones optimizadas de la galería. No incluye correos ni otros archivos del hosting.</p>
          <p class="storage-alert" id="storageAlert" role="status" hidden></p>
        </section>

        <div class="catalog-toolbar">
          <label class="search-field">
            <span class="sr-only">Buscar obras</span>
            <input id="searchInput" type="search" placeholder="Buscar por título o técnica">
          </label>
          <div class="segmented" role="group" aria-label="Filtrar por publicación">
            <button class="active" type="button" data-status="">Todas</button>
            <button type="button" data-status="published">Publicadas</button>
            <button type="button" data-status="draft">Borradores</button>
          </div>
        </div>

        <div class="catalog-status" id="catalogStatus" role="status">Cargando catálogo…</div>
        <div class="works-list" id="worksList"></div>

        <div class="empty-state" id="emptyState" hidden>
          <span aria-hidden="true">○</span>
          <h2>Tu catálogo empieza acá</h2>
          <p>Agregá una obra, completá sus datos y publicala cuando esté lista.</p>
          <button class="button secondary" type="button" data-new-work>Agregar la primera obra</button>
        </div>
      </section>

      <section class="editor-view" id="editorView" hidden>
        <div class="editor-heading">
          <button class="back-button" type="button" id="backButton">← Volver a obras</button>
          <div>
            <p class="eyebrow" id="editorEyebrow">Nueva obra</p>
            <h2 id="editorTitle">Agregar una obra</h2>
          </div>
          <p class="save-status" id="saveStatus" role="status"></p>
        </div>

        <div class="draft-notice" id="draftNotice" hidden>
          <div>
            <strong>Recuperamos tus cambios</strong>
            <p id="draftNoticeText"></p>
          </div>
          <button type="button" id="discardDraftButton">Descartar cambios</button>
        </div>

        <form id="workForm" class="work-form" novalidate>
          <input type="hidden" name="id">
          <div class="form-main">
            <fieldset>
              <legend>Información principal</legend>
              <div class="field-grid">
                <label class="span-2">
                  Título de la obra
                  <input name="title" maxlength="180" required placeholder="Ej. Tarde en la cordillera">
                </label>
                <label>
                  Categoría
                  <select name="categoryId" id="categorySelect">
                    <option value="">Sin categoría</option>
                  </select>
                </label>
                <label>
                  Año
                  <input name="year" type="number" min="1800" max="2100" inputmode="numeric" placeholder="2026">
                </label>
                <label class="span-2">
                  Técnica
                  <input name="technique" maxlength="160" placeholder="Ej. Óleo sobre lienzo">
                </label>
                <label>
                  Ancho (cm)
                  <input name="widthCm" type="number" min="0.1" step="0.1" inputmode="decimal" placeholder="60">
                </label>
                <label>
                  Alto (cm)
                  <input name="heightCm" type="number" min="0.1" step="0.1" inputmode="decimal" placeholder="80">
                </label>
                <label class="span-2">
                  Descripción
                  <textarea name="description" rows="5" placeholder="Agregá detalles concretos de la obra si corresponde."></textarea>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Fotografías</legend>
              <p class="field-help">Podés seleccionar varias. La primera será la portada y luego podrás cambiarla.</p>
              <label class="upload-zone" id="uploadZone">
                <input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple>
                <span class="upload-symbol" aria-hidden="true">＋</span>
                <strong id="uploadActionText">Elegir fotografías</strong>
                <small id="uploadHelpText">JPG, PNG o WebP · máximo 15 MB por imagen · no acepta videos</small>
              </label>
              <div class="selected-image-list" id="selectedImageList" aria-label="Vista previa de las fotografías seleccionadas" hidden></div>
              <div class="upload-status" id="uploadStatus" role="status" aria-live="polite" hidden>
                <div class="upload-status-line">
                  <span class="upload-status-icon" aria-hidden="true"></span>
                  <span id="uploadStatusText"></span>
                  <span class="upload-status-side">
                    <strong id="uploadStatusValue"></strong>
                    <button id="uploadRetryButton" type="button" hidden>Elegir otro archivo</button>
                  </span>
                </div>
                <progress id="uploadProgress" max="100" value="0" aria-label="Progreso de carga" hidden></progress>
              </div>
              <div class="image-list" id="imageList"></div>
            </fieldset>
          </div>

          <aside class="publish-panel">
            <fieldset>
              <legend>Publicación</legend>
              <label>
                Estado
                <select name="publicationStatus">
                  <option value="draft">Borrador</option>
                  <option value="published">Publicada</option>
                </select>
              </label>
              <label>
                Disponibilidad
                <select name="availabilityStatus">
                  <option value="consult">Consultar</option>
                  <option value="available">Disponible</option>
                  <option value="sold">Vendida</option>
                  <option value="commission">Por encargo</option>
                </select>
              </label>
              <label>
                Visibilidad
                <select name="visibility">
                  <option value="public">Pública</option>
                  <option value="private">Privada</option>
                </select>
              </label>
              <label class="check-field">
                <input name="isFeatured" type="checkbox">
                <span>Mostrar como destacada</span>
              </label>
              <label id="featuredOrderField" hidden>
                Orden destacado
                <input name="featuredOrder" type="number" min="0" step="1" value="0">
              </label>
            </fieldset>
            <div class="publish-actions">
              <button class="button primary" type="submit" id="saveButton">Guardar borrador</button>
              <button class="delete-button" type="button" id="deleteButton" hidden>Eliminar obra</button>
            </div>
          </aside>
        </form>
      </section>

      <section class="management-view" id="categoriesView" hidden>
        <div class="management-intro">
          <div>
            <p class="eyebrow">Organización</p>
            <h2>Categorías de obras</h2>
          </div>
          <p>Usalas para ordenar el catálogo y facilitar los filtros del sitio público.</p>
        </div>

        <form class="inline-create" id="categoryCreateForm">
          <label>
            Nueva categoría
            <input name="name" maxlength="80" placeholder="Ej. Bodegones" required>
          </label>
          <label>
            Orden
            <input name="sortOrder" type="number" min="0" step="1" value="40">
          </label>
          <button class="button primary" type="submit">Agregar categoría</button>
        </form>
        <p class="section-message" id="categoryMessage" role="status"></p>
        <div class="category-list" id="categoryList"></div>
      </section>

      <section class="management-view" id="settingsView" hidden>
        <div class="management-intro">
          <div>
            <p class="eyebrow">Sitio público</p>
            <h2>Datos de la artista</h2>
          </div>
          <p>Estos datos se muestran en la presentación y en la sección de contacto.</p>
        </div>

        <form class="settings-form" id="settingsForm" novalidate>
          <div class="settings-main">
            <fieldset>
              <legend>Información de la artista</legend>
              <label>
                Nombre público
                <input name="artist_name" maxlength="120" required placeholder="Carina Donaire">
              </label>
              <label>
                Descripción breve de la artista
                <textarea name="artist_bio" rows="6" maxlength="3000" placeholder="Agregá una presentación breve cuando la artista entregue el texto final."></textarea>
                <small>Opcional. Se muestra en la sección “Sobre mí”; podés escribir más de un párrafo.</small>
              </label>
              <label>
                Ubicación
                <input name="artist_location" maxlength="160" placeholder="Ej. Mendoza, Argentina">
                <small>Opcional. Si queda vacía, no se muestra.</small>
              </label>
            </fieldset>

            <fieldset>
              <legend>Contacto y redes</legend>
              <div class="field-grid">
                <label>
                  Instagram
                  <input name="instagram_url" type="url" placeholder="https://instagram.com/usuario">
                  <small>Opcional. Pegá el enlace completo.</small>
                </label>
                <label>
                  Facebook
                  <input name="facebook_url" type="url" placeholder="https://facebook.com/usuario">
                  <small>Opcional. Pegá el enlace completo.</small>
                </label>
                <label>
                  WhatsApp
                  <input name="whatsapp_url" type="url" placeholder="https://wa.me/5492610000000">
                  <small>Opcional. Usá el enlace de WhatsApp con código de país.</small>
                </label>
              </div>
              <label>
                Opciones de “Me interesa”
                <textarea name="contact_interest_options" rows="4" maxlength="800" placeholder="Encargar un retrato&#10;Comprar una obra disponible&#10;Realizar otra consulta"></textarea>
                <small>Escribí una opción por línea. La primera queda seleccionada por defecto.</small>
              </label>
            </fieldset>

            <fieldset>
              <legend>Portada</legend>
              <p class="field-help">Estas imágenes se muestran en el primer bloque del sitio público.</p>
              <div class="hero-image-settings">
                <div class="hero-image-control">
                  <div class="hero-admin-preview is-large" id="heroLargePreview"><span>Portada grande</span></div>
                  <div>
                    <strong>Imagen principal</strong>
                    <small>Conviene usar una foto horizontal o vertical amplia, con buena luz.</small>
                    <label class="button secondary hero-upload">
                      Elegir imagen
                      <input type="file" accept="image/jpeg,image/png,image/webp" data-hero-image-input data-hero-target="large">
                    </label>
                  </div>
                </div>
                <div class="hero-image-control">
                  <div class="hero-admin-preview is-small" id="heroSmallPreview"><span>Portada chica</span></div>
                  <div>
                    <strong>Imagen de apoyo</strong>
                    <small>Funciona mejor con una obra vertical o un recorte claro.</small>
                    <label class="button secondary hero-upload">
                      Elegir imagen
                      <input type="file" accept="image/jpeg,image/png,image/webp" data-hero-image-input data-hero-target="small">
                    </label>
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Encargos</legend>
              <div class="hero-image-control">
                <div class="hero-admin-preview is-commission" id="commissionPreview"><span>Imagen de encargos</span></div>
                <div>
                  <strong>Imagen de la sección</strong>
                  <small>Se usa junto al bloque de retratos y obras por encargo.</small>
                  <label class="button secondary hero-upload">
                    Elegir imagen
                    <input type="file" accept="image/jpeg,image/png,image/webp" data-hero-image-input data-hero-target="commission">
                  </label>
                </div>
              </div>
              <div class="field-grid settings-step-grid">
                <label>
                  Etiqueta
                  <input name="commission_kicker" maxlength="120" placeholder="Obras por encargo">
                </label>
                <label>
                  Título
                  <input name="commission_title" maxlength="180" placeholder="Retratos y obras por encargo.">
                </label>
                <label class="span-2">
                  Texto principal
                  <textarea name="commission_text" rows="4" maxlength="900" placeholder="Consultas por retratos, mascotas, paisajes u obras personalizadas."></textarea>
                </label>
                <label>
                  Paso 1
                  <input name="commission_step_1_title" maxlength="120" placeholder="Enviar referencia">
                </label>
                <label>
                  Descripción paso 1
                  <input name="commission_step_1_text" maxlength="220" placeholder="Compartí las imágenes y el tipo de obra que querés consultar.">
                </label>
                <label>
                  Paso 2
                  <input name="commission_step_2_title" maxlength="120" placeholder="Definir formato">
                </label>
                <label>
                  Descripción paso 2
                  <input name="commission_step_2_text" maxlength="220" placeholder="Se revisan composición, tamaño y condiciones antes de iniciar.">
                </label>
                <label>
                  Paso 3
                  <input name="commission_step_3_title" maxlength="120" placeholder="Coordinar inicio">
                </label>
                <label>
                  Descripción paso 3
                  <input name="commission_step_3_text" maxlength="220" placeholder="La artista confirma disponibilidad y próximos pasos por WhatsApp.">
                </label>
              </div>
            </fieldset>
          </div>

          <aside class="profile-panel">
            <h3>Fotografía</h3>
            <div class="profile-preview" id="profilePreview"><span>Sin fotografía</span></div>
            <label class="button secondary profile-upload">
              Elegir fotografía
              <input id="profileImageInput" type="file" accept="image/jpeg,image/png,image/webp">
            </label>
            <small>Se optimiza automáticamente a WebP.</small>
            <div class="settings-actions">
              <p class="section-message" id="settingsMessage" role="status"></p>
              <button class="button primary" type="submit" id="settingsSaveButton">Guardar cambios</button>
            </div>
          </aside>
        </form>
      </section>
    </main>
  </div>

  <template id="workRowTemplate">
    <article class="work-row">
      <div class="work-thumb"><span>Sin foto</span></div>
      <div class="work-details">
        <div>
          <p class="work-category"></p>
          <h2></h2>
        </div>
        <p class="work-meta"></p>
      </div>
      <span class="status-chip"></span>
      <button class="row-action" type="button">Editar<span aria-hidden="true">→</span></button>
    </article>
  </template>

  <script>window.__ADMIN_BOOT__ = <?= json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;</script>
  <script src="admin.js?v=20260722-1" defer></script>
</body>
</html>
