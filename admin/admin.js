(() => {
  "use strict";

  const boot = window.__ADMIN_BOOT__;
  const api = boot.apiBase;
  let csrf = boot.csrf;
  let works = [];
  let categories = [];
  let activeStatus = "";
  let editingId = null;
  let searchTimer = null;

  const byId = (id) => document.getElementById(id);
  const catalogView = byId("catalogView");
  const editorView = byId("editorView");
  const categoriesView = byId("categoriesView");
  const settingsView = byId("settingsView");
  const workForm = byId("workForm");
  const saveButton = byId("saveButton");
  const saveStatus = byId("saveStatus");

  function isLocalNetworkHost(hostname) {
    return (
      ["localhost", "127.0.0.1", "::1"].includes(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  }

  function assetUrl(path) {
    if (!path || !path.startsWith("/")) return path;
    const localProject = window.location.pathname.match(/^\/(.+?)\/admin(?:\/|$)/);
    if (
      localProject &&
      isLocalNetworkHost(window.location.hostname) &&
      (path.startsWith("/art/") || path.startsWith("/uploads/"))
    ) {
      return `/${localProject[1]}/public${path}`;
    }
    return path;
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (options.method && options.method !== "GET") {
      headers.set("X-CSRF-Token", csrf);
    }
    const response = await fetch(`${api}${path}`, { credentials: "same-origin", ...options, headers });
    const payload = await response.json().catch(() => ({ error: "La respuesta del servidor no es válida." }));
    if (!response.ok) {
      const error = new Error(payload.error || "No pudimos completar la acción.");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = busyText;
    } else if (button.dataset.label) {
      button.textContent = button.dataset.label;
    }
    button.disabled = busy;
  }

  async function handleAccess(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = byId("accessSubmit");
    const message = byId("accessMessage");
    const data = new FormData(form);
    message.textContent = "";
    setBusy(submit, true, boot.needsSetup ? "Creando acceso…" : "Ingresando…");
    try {
      await request("/admin/session.php", {
        method: "POST",
        body: JSON.stringify({
          action: boot.needsSetup ? "setup" : "login",
          displayName: data.get("displayName"),
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      window.location.reload();
    } catch (error) {
      message.textContent = error.message;
      setBusy(submit, false);
    }
  }

  async function loadCategories() {
    const payload = await request("/admin/categories.php");
    categories = payload.categories;
    const select = byId("categorySelect");
    select.replaceChildren(new Option("Sin categoría", ""));
    categories.filter((category) => category.isActive).forEach((category) => select.add(new Option(category.name, String(category.id))));
    renderCategories();
  }

  function renderCategories() {
    const list = byId("categoryList");
    list.replaceChildren();
    categories.forEach((category) => {
      const row = document.createElement("form");
      row.className = "category-row";
      row.dataset.id = category.id;

      const nameLabel = document.createElement("label");
      nameLabel.textContent = "Nombre";
      const nameInput = document.createElement("input");
      nameInput.name = "name";
      nameInput.value = category.name;
      nameInput.maxLength = 80;
      nameInput.required = true;
      nameLabel.append(nameInput);

      const orderLabel = document.createElement("label");
      orderLabel.textContent = "Orden";
      const orderInput = document.createElement("input");
      orderInput.name = "sortOrder";
      orderInput.type = "number";
      orderInput.min = "0";
      orderInput.step = "1";
      orderInput.value = category.sortOrder;
      orderLabel.append(orderInput);

      const count = document.createElement("p");
      count.className = "work-count";
      count.textContent = category.workCount === 1 ? "1 obra" : `${category.workCount} obras`;

      const actions = document.createElement("div");
      actions.className = "category-actions";
      const save = document.createElement("button");
      save.type = "submit";
      save.textContent = "Guardar";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = category.workCount > 0 ? "category-in-use" : "remove-category";
      remove.textContent = category.workCount > 0 ? "En uso" : "Eliminar";
      remove.disabled = category.workCount > 0;
      remove.title = category.workCount > 0 ? "Primero reasigná las obras de esta categoría" : "Eliminar categoría";
      remove.addEventListener("click", () => deleteCategory(category.id, category.name));
      actions.append(save, remove);

      row.append(nameLabel, orderLabel, count, actions);
      row.addEventListener("submit", (event) => saveCategory(event, category.id));
      list.append(row);
    });
  }

  async function saveCategory(event, id = null) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]');
    const data = new FormData(form);
    setBusy(submit, true, "Guardando…");
    try {
      const payload = await request("/admin/categories.php", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({ id, name: data.get("name"), sortOrder: data.get("sortOrder") }),
      });
      categories = payload.categories;
      byId("categoryMessage").textContent = payload.message;
      if (!id) form.reset();
      await loadCategories();
    } catch (error) {
      byId("categoryMessage").textContent = error.message;
    } finally {
      setBusy(submit, false);
    }
  }

  async function deleteCategory(id, name) {
    if (!window.confirm(`¿Eliminar la categoría “${name}”?`)) return;
    try {
      const payload = await request("/admin/categories.php", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      byId("categoryMessage").textContent = payload.message;
      await loadCategories();
    } catch (error) {
      byId("categoryMessage").textContent = error.message;
    }
  }

  async function loadSettings() {
    const payload = await request("/admin/settings.php");
    Object.entries(payload.settings).forEach(([key, value]) => {
      const field = byId("settingsForm").elements.namedItem(key);
      if (field) field.value = value || "";
    });
    document.querySelectorAll(".wordmark").forEach((element) => {
      element.textContent = payload.settings.artist_name || "Nombre de la artista";
    });
    renderProfile(payload.settings.artist_photo);
  }

  function renderProfile(path) {
    const preview = byId("profilePreview");
    if (!path) {
      preview.replaceChildren(Object.assign(document.createElement("span"), { textContent: "Sin fotografía" }));
      return;
    }
    const image = new Image();
    image.src = assetUrl(path);
    image.alt = "Fotografía actual de la artista";
    preview.replaceChildren(image);
  }

  async function saveSettings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const button = byId("settingsSaveButton");
    const message = byId("settingsMessage");
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    message.textContent = "";
    setBusy(button, true, "Guardando…");
    try {
      const result = await request("/admin/settings.php", { method: "PUT", body: JSON.stringify(payload) });
      message.textContent = result.message;
      document.querySelectorAll(".wordmark").forEach((element) => {
        element.textContent = result.settings.artist_name || "Nombre de la artista";
      });
    } catch (error) {
      message.textContent = error.message;
    } finally {
      setBusy(button, false);
    }
  }

  async function uploadProfileImage(event) {
    const file = event.currentTarget.files[0];
    if (!file) return;
    const message = byId("settingsMessage");
    message.textContent = "Optimizando fotografía…";
    const data = new FormData();
    data.append("image", file);
    try {
      const payload = await request("/admin/artist-image.php", { method: "POST", body: data });
      renderProfile(payload.url);
      message.textContent = payload.message;
    } catch (error) {
      message.textContent = error.message;
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function loadWorks() {
    const status = byId("catalogStatus");
    const search = byId("searchInput").value.trim();
    status.textContent = "Actualizando catálogo…";
    try {
      const params = new URLSearchParams();
      if (activeStatus) params.set("status", activeStatus);
      if (search) params.set("search", search);
      const payload = await request(`/admin/works.php?${params}`);
      works = payload.works;
      byId("totalCount").textContent = payload.summary.total;
      byId("publishedCount").textContent = payload.summary.published;
      byId("draftCount").textContent = payload.summary.drafts;
      renderWorks();
      status.textContent = works.length ? `${works.length} ${works.length === 1 ? "obra encontrada" : "obras encontradas"}` : "";
    } catch (error) {
      status.textContent = error.message;
      byId("worksList").replaceChildren();
    }
  }

  function renderWorks() {
    const list = byId("worksList");
    const template = byId("workRowTemplate");
    list.replaceChildren();
    works.forEach((work) => {
      const fragment = template.content.cloneNode(true);
      const article = fragment.querySelector(".work-row");
      const thumb = fragment.querySelector(".work-thumb");
      if (work.thumbnail) {
        const image = new Image();
        image.src = assetUrl(work.thumbnail);
        image.alt = "";
        image.loading = "lazy";
        thumb.replaceChildren(image);
      }
      fragment.querySelector(".work-category").textContent = work.category;
      fragment.querySelector("h2").textContent = work.title;
      const details = [work.technique, work.year, work.imageCount === 1 ? "1 foto" : `${work.imageCount} fotos`].filter(Boolean);
      fragment.querySelector(".work-meta").textContent = details.join(" · ") || "Datos por completar";
      const chip = fragment.querySelector(".status-chip");
      chip.textContent = work.publicationStatus === "published" ? "Publicada" : "Borrador";
      chip.classList.toggle("published", work.publicationStatus === "published");
      const button = fragment.querySelector(".row-action");
      button.setAttribute("aria-label", `Editar ${work.title}`);
      button.addEventListener("click", () => openEditor(work.id));
      article.addEventListener("dblclick", () => openEditor(work.id));
      list.append(fragment);
    });
    byId("emptyState").hidden = works.length !== 0 || byId("searchInput").value.trim() !== "" || activeStatus !== "";

  }

  function formValue(name, value) {
    const field = workForm.elements.namedItem(name);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
  }

  function showAdminView(view) {
    catalogView.hidden = view !== "works";
    editorView.hidden = true;
    categoriesView.hidden = view !== "categories";
    settingsView.hidden = view !== "settings";
    byId("newWorkButton").hidden = view !== "works";

    const labels = {
      works: ["Catálogo", "Obras"],
      categories: ["Organización", "Categorías"],
      settings: ["Sitio público", "Datos del estudio"],
    };
    byId("topbarEyebrow").textContent = labels[view][0];
    byId("topbarTitle").textContent = labels[view][1];
    document.querySelectorAll("[data-admin-view]").forEach((link) => {
      const active = link.dataset.adminView === view;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    if (view === "categories") loadCategories().catch((error) => { byId("categoryMessage").textContent = error.message; });
    if (view === "settings") loadSettings().catch((error) => { byId("settingsMessage").textContent = error.message; });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  async function openEditor(id = null) {
    editingId = id;
    workForm.reset();
    byId("imageList").replaceChildren();
    formValue("id", id || "");
    formValue("publicationStatus", "draft");
    formValue("availabilityStatus", "available");
    formValue("visibility", "public");
    formValue("featuredOrder", 0);
    byId("editorEyebrow").textContent = id ? "Editar obra" : "Nueva obra";
    byId("editorTitle").textContent = id ? "Cargando…" : "Agregar una obra";
    byId("deleteButton").hidden = !id;
    byId("newWorkButton").hidden = true;
    saveStatus.textContent = "";
    catalogView.hidden = true;
    categoriesView.hidden = true;
    settingsView.hidden = true;
    editorView.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });

    if (id) {
      try {
        const [{ work }, imagesPayload] = await Promise.all([
          request(`/admin/works.php?id=${id}`),
          request(`/admin/images.php?work_id=${id}`),
        ]);
        formValue("title", work.title);
        formValue("categoryId", work.categoryId);
        formValue("year", work.year);
        formValue("technique", work.technique);
        formValue("widthCm", work.widthCm);
        formValue("heightCm", work.heightCm);
        formValue("description", work.description);
        formValue("publicationStatus", work.publicationStatus);
        formValue("availabilityStatus", work.availabilityStatus);
        formValue("visibility", work.visibility);
        formValue("isFeatured", work.isFeatured);
        formValue("featuredOrder", work.featuredOrder);
        byId("editorTitle").textContent = work.title;
        toggleFeaturedOrder();
        renderImages(imagesPayload.images);
        updateSaveLabel();
      } catch (error) {
        saveStatus.textContent = error.message;
      }
    } else {
      toggleFeaturedOrder();
      updateSaveLabel();
      setTimeout(() => workForm.elements.title.focus(), 0);
    }
  }

  function closeEditor() {
    byId("newWorkButton").hidden = false;
    editingId = null;
    loadWorks();
    showAdminView("works");
  }

  function workPayload() {
    const data = new FormData(workForm);
    return {
      id: editingId,
      title: data.get("title"),
      categoryId: data.get("categoryId"),
      year: data.get("year"),
      technique: data.get("technique"),
      widthCm: data.get("widthCm"),
      heightCm: data.get("heightCm"),
      description: data.get("description"),
      publicationStatus: data.get("publicationStatus"),
      availabilityStatus: data.get("availabilityStatus"),
      visibility: data.get("visibility"),
      isFeatured: data.get("isFeatured") === "on",
      featuredOrder: data.get("featuredOrder"),
    };
  }

  async function saveWork(event) {
    event.preventDefault();
    saveStatus.textContent = "";
    if (!workForm.reportValidity()) return;
    setBusy(saveButton, true, "Guardando…");
    try {
      const payload = await request("/admin/works.php", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(workPayload()),
      });
      editingId = payload.id;
      formValue("id", payload.id);
      byId("deleteButton").hidden = false;
      byId("editorEyebrow").textContent = "Editar obra";
      byId("editorTitle").textContent = workForm.elements.title.value;

      const files = workForm.elements.images.files;
      if (files.length) {
        saveButton.textContent = "Optimizando fotos…";
        const formData = new FormData();
        formData.append("work_id", String(editingId));
        Array.from(files).forEach((file) => formData.append("images[]", file));
        await request("/admin/images.php", { method: "POST", body: formData });
        workForm.elements.images.value = "";
        await loadImages();
      }
      saveStatus.textContent = payload.message;
    } catch (error) {
      saveStatus.textContent = error.message;
    } finally {
      setBusy(saveButton, false);
      updateSaveLabel();
    }
  }

  async function loadImages() {
    if (!editingId) return;
    const payload = await request(`/admin/images.php?work_id=${editingId}`);
    renderImages(payload.images);
  }

  function renderImages(images) {
    const list = byId("imageList");
    list.replaceChildren();
    images.forEach((image) => {
      const item = document.createElement("div");
      item.className = "image-item";
      const preview = new Image();
      preview.src = assetUrl(image.thumbnailPath);
      preview.alt = image.altText;
      const actions = document.createElement("div");
      actions.className = "image-item-actions";
      const cover = document.createElement("button");
      cover.type = "button";
      cover.textContent = image.isCover ? "Portada" : "Usar de portada";
      cover.disabled = image.isCover;
      cover.addEventListener("click", () => setCover(image.id));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Quitar";
      remove.addEventListener("click", () => deleteImage(image.id));
      actions.append(cover, remove);
      item.append(preview, actions);
      list.append(item);
    });
  }

  async function setCover(imageId) {
    saveStatus.textContent = "Actualizando portada…";
    try {
      await request("/admin/images.php", { method: "PATCH", body: JSON.stringify({ imageId }) });
      await loadImages();
      saveStatus.textContent = "Portada actualizada.";
    } catch (error) {
      saveStatus.textContent = error.message;
    }
  }

  async function deleteImage(imageId) {
    if (!window.confirm("¿Quitar esta fotografía de la obra?")) return;
    try {
      await request("/admin/images.php", { method: "DELETE", body: JSON.stringify({ imageId }) });
      await loadImages();
      saveStatus.textContent = "Fotografía eliminada.";
    } catch (error) {
      saveStatus.textContent = error.message;
    }
  }

  async function deleteWork() {
    if (!editingId || !window.confirm("¿Eliminar esta obra? Esta acción no se puede deshacer.")) return;
    const button = byId("deleteButton");
    setBusy(button, true, "Eliminando…");
    try {
      await request("/admin/works.php", { method: "DELETE", body: JSON.stringify({ id: editingId }) });
      closeEditor();
    } catch (error) {
      saveStatus.textContent = error.message;
      setBusy(button, false);
    }
  }

  function toggleFeaturedOrder() {
    byId("featuredOrderField").hidden = !workForm.elements.isFeatured.checked;
  }

  function updateSaveLabel() {
    saveButton.textContent = workForm.elements.publicationStatus.value === "published" ? "Guardar y publicar" : "Guardar borrador";
  }

  function bindAdminEvents() {
    byId("newWorkButton").addEventListener("click", () => openEditor());
    document.querySelectorAll("[data-new-work]").forEach((button) => button.addEventListener("click", () => openEditor()));
    byId("backButton").addEventListener("click", closeEditor);
    workForm.addEventListener("submit", saveWork);
    byId("deleteButton").addEventListener("click", deleteWork);
    byId("categoryCreateForm").addEventListener("submit", (event) => saveCategory(event));
    byId("settingsForm").addEventListener("submit", saveSettings);
    byId("profileImageInput").addEventListener("change", uploadProfileImage);
    document.querySelectorAll("[data-admin-view]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showAdminView(link.dataset.adminView);
      });
    });
    workForm.elements.isFeatured.addEventListener("change", toggleFeaturedOrder);
    workForm.elements.publicationStatus.addEventListener("change", updateSaveLabel);
    byId("searchInput").addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(loadWorks, 250);
    });
    document.querySelectorAll(".segmented [data-status]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".segmented [data-status]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        activeStatus = button.dataset.status;
        loadWorks();
      });
    });
    const sidebar = byId("sidebar");
    const menuToggle = byId("menuToggle");
    const closeMenu = () => {
      sidebar.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.querySelector(".sr-only").textContent = "Abrir menú";
    };
    menuToggle.addEventListener("click", () => {
      const open = !sidebar.classList.contains("open");
      sidebar.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.querySelector(".sr-only").textContent = open ? "Cerrar menú" : "Abrir menú";
    });
    byId("sidebarBackdrop").addEventListener("click", closeMenu);
    sidebar.querySelectorAll("nav a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar.classList.contains("open")) {
        closeMenu();
        menuToggle.focus();
      }
    });
    byId("logoutButton").addEventListener("click", async () => {
      await request("/admin/session.php", { method: "DELETE" });
      window.location.reload();
    });
  }

  byId("accessForm").addEventListener("submit", handleAccess);
  if (boot.authenticated) {
    bindAdminEvents();
    Promise.all([loadCategories(), loadWorks(), loadSettings()]).catch((error) => {
      byId("catalogStatus").textContent = error.message;
    });
  }
})();
