"use client";

import {
  type CSSProperties,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Category = string;
type RevealStyle = CSSProperties & {
  "--reveal-delay"?: string;
  "--art-drift-x"?: string;
  "--art-drift-y"?: string;
};

interface Work {
  id: number;
  title: string;
  category: string;
  image: string;
  altText?: string;
  description?: string;
  medium?: string;
  size?: string;
  status: string;
}

interface SiteSettings {
  artist_name: string;
  artist_bio: string;
  artist_location: string;
  artist_photo: string;
  hero_large_image: string;
  hero_small_image: string;
  hero_large_alt: string;
  hero_small_alt: string;
  contact_interest_options: string;
  commission_image: string;
  commission_kicker: string;
  commission_title: string;
  commission_text: string;
  commission_step_1_title: string;
  commission_step_1_text: string;
  commission_step_2_title: string;
  commission_step_2_text: string;
  commission_step_3_title: string;
  commission_step_3_text: string;
  instagram_url: string;
  facebook_url: string;
  whatsapp_url: string;
}

const defaultSettings: SiteSettings = {
  artist_name: "Carina Donaire",
  artist_bio: "Texto de presentación a definir con la artista.",
  artist_location: "Mendoza, Argentina",
  artist_photo: "",
  hero_large_image: "/art/obras-reales/contexto/carina-pintando-alas-hero.webp",
  hero_small_image: "/art/obras-reales/uvas-borgona-vertical.webp",
  hero_large_alt: "Carina Donaire pintando alas coloridas sobre un panel de madera",
  hero_small_alt: "Pintura vertical de un racimo de uvas borgoña con reflejos violetas",
  contact_interest_options:
    "Encargar un retrato\nComprar una obra disponible\nRealizar otra consulta",
  commission_image: "/art/obras-reales/contexto/corcho-humeante-obra.webp",
  commission_kicker: "Obras por encargo",
  commission_title: "Retratos y obras por encargo.",
  commission_text:
    "Consultas por retratos, mascotas, paisajes u obras personalizadas. Los detalles de técnica, formato, tiempos y condiciones se coordinan directamente con la artista.",
  commission_step_1_title: "Enviar referencia",
  commission_step_1_text:
    "Compartí las imágenes y el tipo de obra que querés consultar.",
  commission_step_2_title: "Definir formato",
  commission_step_2_text:
    "Se revisan composición, tamaño y condiciones antes de iniciar.",
  commission_step_3_title: "Coordinar inicio",
  commission_step_3_text:
    "La artista confirma disponibilidad y próximos pasos por WhatsApp.",
  instagram_url: "",
  facebook_url: "",
  whatsapp_url: "https://wa.me/5492634620883",
};

const navLinks = [
  ["Inicio", "#inicio"],
  ["Obras", "#obras"],
  ["Encargos", "#encargos"],
  ["Sobre mí", "#artista"],
  ["Contacto", "#contacto"],
];

function getRevealStyle(index: number): RevealStyle {
  const drift = [
    ["-0.45%", "-0.3%"],
    ["0.35%", "-0.45%"],
    ["-0.25%", "0.35%"],
  ][index % 3];

  return {
    "--reveal-delay": `${Math.min(index, 5) * 70}ms`,
    "--art-drift-x": drift[0],
    "--art-drift-y": drift[1],
  };
}

const placeholderTexts = new Set([
  "A definir",
  "Técnica a definir",
  "Medidas a definir",
  "Título descriptivo provisorio.",
]);

function cleanWorkText(value?: string | null) {
  const text = (value ?? "").trim();
  return text && !placeholderTexts.has(text) ? text : "";
}

function getArtistBioParagraphs(value?: string | null) {
  const text = (value ?? "").trim();
  const lowerText = text.toLocaleLowerCase("es-AR");
  const isPlaceholder =
    !text ||
    lowerText.includes("a definir") ||
    lowerText.includes("se completará próximamente") ||
    lowerText.includes("información biográfica") ||
    lowerText.includes("recorrido y proceso artístico");

  return isPlaceholder ? [] : text.split(/\n+/);
}

function getWorkSpecs(work: Work) {
  return [cleanWorkText(work.medium), cleanWorkText(work.size)].filter(Boolean);
}

function settingText(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function getContactInterestOptions(value?: string | null) {
  const options = (value ?? "")
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 8);

  return options.length
    ? options
    : defaultSettings.contact_interest_options.split("\n");
}

function getFormValue(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function buildWhatsAppMessage(data: FormData) {
  const name = getFormValue(data, "name");
  const interest = getFormValue(data, "interest") || "Consulta desde la web";
  const message = getFormValue(data, "message");

  return [
    "Hola Carina, te escribo desde carinadonaire.com.ar.",
    "",
    `Nombre: ${name}`,
    `Consulta: ${interest}`,
    "",
    "Mensaje:",
    message,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWhatsAppUrl(rawUrl: string, message: string) {
  const value = rawUrl.trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";

    const host = url.hostname.replace(/^www\./, "");
    if (host === "wa.me") {
      const phone = url.pathname.replace(/\D/g, "");
      if (!phone) return "";
      const next = new URL(`https://wa.me/${phone}`);
      next.searchParams.set("text", message);
      return next.toString();
    }

    if (host === "api.whatsapp.com" || host.endsWith(".whatsapp.com")) {
      url.searchParams.set("text", message);
      return url.toString();
    }

    return "";
  } catch {
    return "";
  }
}

export default function Home() {
  const [category, setCategory] = useState<Category>("Todas");
  const [contactStatus, setContactStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [contactMessage, setContactMessage] = useState("");
  const [works, setWorks] = useState<Work[]>([]);
  const [catalogMessage, setCatalogMessage] = useState("Cargando obras...");
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(works.map((work) => work.category)))],
    [works],
  );

  const visibleWorks = useMemo(
    () =>
      category === "Todas"
        ? works
        : works.filter((work) => work.category === category),
    [category, works],
  );
  const lightboxOpen = selectedWork !== null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        let response = await fetch("/api/works.php", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          response = await fetch("/data/works.json", {
            signal: controller.signal,
          });
        }
        if (!response.ok) {
          throw new Error("No se pudo cargar el catálogo");
        }
        const payload = (await response.json()) as { works?: Work[] };
        const nextWorks = Array.isArray(payload.works) ? payload.works : [];
        setWorks(nextWorks);
        setCatalogMessage(
          nextWorks.length === 0
            ? "Todavía no hay obras publicadas."
            : "",
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setCatalogMessage(
            "No pudimos cargar las obras. Intentá nuevamente en unos minutos.",
          );
        }
      }
    }

    loadCatalog();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      try {
        let response = await fetch("/api/settings.php", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          response = await fetch("/data/settings.json", {
            signal: controller.signal,
          });
        }
        if (!response.ok) return;
        const payload = (await response.json()) as {
          settings?: Partial<SiteSettings>;
        };
        const nextSettings = { ...defaultSettings, ...payload.settings };
        if (!nextSettings.whatsapp_url.trim()) {
          nextSettings.whatsapp_url = defaultSettings.whatsapp_url;
        }
        setSettings(nextSettings);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSettings(defaultSettings);
        }
      }
    }

    loadSettings();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lightboxCloseRef.current?.focus();

    function showRelativeWork(offset: number) {
      setSelectedWork((current) => {
        if (!current || visibleWorks.length < 2) return current;
        const currentIndex = visibleWorks.findIndex(
          (work) => work.id === current.id,
        );
        const nextIndex =
          (currentIndex + offset + visibleWorks.length) % visibleWorks.length;
        return visibleWorks[nextIndex];
      });
    }

    function handleLightboxKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedWork(null);
        return;
      }
      if (event.key === "ArrowRight") {
        showRelativeWork(1);
        return;
      }
      if (event.key === "ArrowLeft") {
        showRelativeWork(-1);
        return;
      }
      if (event.key !== "Tab") return;

      const controls = Array.from(
        lightboxRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
        ) ?? [],
      );
      if (controls.length === 0) return;

      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    }

    window.addEventListener("keydown", handleLightboxKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleLightboxKeydown);
      previousFocus?.focus();
    };
  }, [lightboxOpen, visibleWorks]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      return;
    }

    document.documentElement.classList.add("motion-ready");

    return () => {
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>(".scroll-reveal"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16,
      },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [category, works.length]);

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const message = buildWhatsAppMessage(data);
    const whatsappUrl = buildWhatsAppUrl(settings.whatsapp_url, message);

    if (!whatsappUrl) {
      setContactStatus("error");
      setContactMessage(
        "El WhatsApp de contacto todavia no esta configurado. Revisalo desde el panel.",
      );
      return;
    }

    setContactStatus("sending");
    setContactMessage("Abriendo WhatsApp...");

    const opened = window.open(whatsappUrl, "_blank");
    if (opened) {
      opened.opener = null;
    } else {
      window.location.assign(whatsappUrl);
    }

    setContactStatus("sent");
    setContactMessage(
      "Se abrio WhatsApp con tu consulta preparada para enviar.",
    );
    form.reset();
  }

  const selectedWorkSpecs = selectedWork ? getWorkSpecs(selectedWork) : [];
  const selectedDescription = selectedWork
    ? cleanWorkText(selectedWork.description)
    : "";
  const artistBioParagraphs = getArtistBioParagraphs(settings.artist_bio);
  const contactInterestOptions = getContactInterestOptions(
    settings.contact_interest_options,
  );
  const commissionSteps = [
    [
      "01",
      settingText(
        settings.commission_step_1_title,
        defaultSettings.commission_step_1_title,
      ),
      settingText(
        settings.commission_step_1_text,
        defaultSettings.commission_step_1_text,
      ),
    ],
    [
      "02",
      settingText(
        settings.commission_step_2_title,
        defaultSettings.commission_step_2_title,
      ),
      settingText(
        settings.commission_step_2_text,
        defaultSettings.commission_step_2_text,
      ),
    ],
    [
      "03",
      settingText(
        settings.commission_step_3_title,
        defaultSettings.commission_step_3_title,
      ),
      settingText(
        settings.commission_step_3_text,
        defaultSettings.commission_step_3_text,
      ),
    ],
  ];

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Ir al inicio">
          {settings.artist_name}
        </a>
        <nav
          id="navegacion-principal"
          className="main-nav"
          aria-label="Navegación principal"
        >
          {navLinks.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main>
      <section className="hero" id="inicio">
        <div className="hero-copy reveal reveal-delay">
          <p className="eyebrow">Carina Donaire · Artista visual</p>
          <h1>
            Pintura original <em>hecha a mano</em>
          </h1>
          <span className="brush-stroke" aria-hidden="true" />
          <p className="hero-intro">
            Portfolio de obras originales, piezas figurativas, naturaleza y
            encargos personalizados realizados en Mendoza.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#obras">
              Explorar obras
            </a>
            <a className="button button-secondary" href="#encargos">
              Consultar un encargo
            </a>
          </div>
        </div>

        <div className="hero-gallery reveal">
          <div className="hero-landscape">
            <img
              src={
                settings.hero_large_image ||
                defaultSettings.hero_large_image
              }
              alt={settings.hero_large_alt || defaultSettings.hero_large_alt}
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <div className="hero-portrait">
            <img
              src={
                settings.hero_small_image ||
                defaultSettings.hero_small_image
              }
              alt={settings.hero_small_alt || defaultSettings.hero_small_alt}
              decoding="async"
              loading="eager"
            />
            <span>Obra original</span>
          </div>
          <p className="hero-note">Pintura mural sobre madera</p>
        </div>
      </section>

      <nav className="category-ribbon" aria-label="Categorías de obras">
        {categories.slice(1).map((item, index) => (
          <a key={item} href="#obras" onClick={() => selectCategory(item)}>
            <span>{String(index + 1).padStart(2, "0")}</span> {item}
          </a>
        ))}
      </nav>

      <section className="intro section-shell scroll-reveal" id="artista">
        <p className="section-kicker">La obra</p>
        <div
          className={settings.artist_photo ? "intro-grid has-photo" : "intro-grid"}
        >
          <h2>Obras originales, retratos y encargos personalizados.</h2>
          {settings.artist_photo && (
            <div className="artist-photo">
              <img
                src={settings.artist_photo}
                alt={`Retrato de ${settings.artist_name}`}
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
          <div>
            {artistBioParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <a className="text-link" href="#contacto">
              Consultar por obras o encargos <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="works-section" id="obras">
        <div className="section-shell works-header scroll-reveal">
          <div>
            <p className="section-kicker">Galería</p>
            <h2>Obras seleccionadas</h2>
          </div>
          <div className="filters" role="group" aria-label="Filtrar obras">
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                className={category === item ? "active" : ""}
                aria-pressed={category === item}
                onClick={() => selectCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div
          className="works-grid section-shell"
          aria-live="polite"
          key={category}
        >
          {catalogMessage && (
            <p className="catalog-message" role="status">
              {catalogMessage}
            </p>
          )}
          {visibleWorks.map((work, index) => {
            const specs = getWorkSpecs(work);
            return (
              <article
                className={`work-card work-${index + 1} scroll-reveal`}
                key={work.id}
                style={getRevealStyle(index)}
              >
                <button
                  className="work-open"
                  type="button"
                  aria-label={`Ampliar obra: ${work.title}`}
                  onClick={() => setSelectedWork(work)}
                >
                  <div className="work-image">
                    <img
                      src={work.image}
                      alt={work.altText || work.title}
                      decoding="async"
                      loading={index < 2 ? "eager" : "lazy"}
                    />
                    <span>{work.status}</span>
                  </div>
                  <div className="work-caption">
                    <div>
                      <p>{work.category}</p>
                      <h3>{work.title}</h3>
                    </div>
                    {specs.length > 0 && (
                      <p className="work-specs">
                        {specs.map((spec) => (
                          <span key={spec}>{spec}</span>
                        ))}
                      </p>
                    )}
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {selectedWork && (
        <div
          className="art-lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedWork(null);
          }}
        >
          <div className="art-lightbox-panel" ref={lightboxRef}>
            <button
              className="lightbox-close"
              type="button"
              ref={lightboxCloseRef}
              onClick={() => setSelectedWork(null)}
              aria-label="Cerrar obra ampliada"
            >
              Cerrar <span aria-hidden="true">×</span>
            </button>

            <div className="lightbox-stage">
              <img
                key={selectedWork.id}
                src={selectedWork.image}
                alt={selectedWork.altText || selectedWork.title}
                decoding="async"
              />
            </div>

            <div className="lightbox-details">
              <p>{selectedWork.category}</p>
              <h2 id="lightbox-title">{selectedWork.title}</h2>
              {selectedWorkSpecs.length > 0 && (
                <p className="lightbox-specs">
                  {selectedWorkSpecs.join(" / ")}
                </p>
              )}
              {selectedDescription && (
                <p className="lightbox-description">{selectedDescription}</p>
              )}
              <p className="lightbox-counter" aria-live="polite">
                {visibleWorks.findIndex((work) => work.id === selectedWork.id) +
                  1}{" "}
                de {visibleWorks.length}
              </p>
              {visibleWorks.length > 1 && (
                <div className="lightbox-navigation">
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = visibleWorks.findIndex(
                        (work) => work.id === selectedWork.id,
                      );
                      setSelectedWork(
                        visibleWorks[
                          (currentIndex - 1 + visibleWorks.length) %
                            visibleWorks.length
                        ],
                      );
                    }}
                    aria-label="Ver obra anterior"
                  >
                    <span aria-hidden="true">←</span> Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = visibleWorks.findIndex(
                        (work) => work.id === selectedWork.id,
                      );
                      setSelectedWork(
                        visibleWorks[(currentIndex + 1) % visibleWorks.length],
                      );
                    }}
                    aria-label="Ver obra siguiente"
                  >
                    Siguiente <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="commissions" id="encargos">
        <div className="commission-image scroll-reveal">
          <img
            src={settings.commission_image || defaultSettings.commission_image}
            alt="Imagen de obra por encargo"
            decoding="async"
            loading="lazy"
          />
        </div>
        <div className="commission-content scroll-reveal">
          <p className="section-kicker">
            {settingText(
              settings.commission_kicker,
              defaultSettings.commission_kicker,
            )}
          </p>
          <h2>
            {settingText(
              settings.commission_title,
              defaultSettings.commission_title,
            )}
          </h2>
          <p className="commission-lead">
            {settingText(
              settings.commission_text,
              defaultSettings.commission_text,
            )}
          </p>
          <ol className="steps">
            {commissionSteps.map(([number, title, description], index) => (
              <li
                className="scroll-reveal"
                key={number}
                style={getRevealStyle(index)}
              >
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
          <a className="button button-primary" href="#contacto">
            Consultar un encargo
          </a>
        </div>
      </section>

      <section className="contact section-shell scroll-reveal" id="contacto">
        <div className="contact-copy">
          <p className="section-kicker">Contacto</p>
          <h2>Consultá por obras disponibles o encargos.</h2>
          <p>
            Escribí para coordinar una consulta, pedir información sobre una
            obra o encargar una pieza personalizada.
          </p>
          {(settings.instagram_url ||
            settings.facebook_url ||
            settings.whatsapp_url ||
            settings.artist_location) && (
            <div className="contact-details">
              {settings.instagram_url && (
                <p>
                  <span>Instagram</span>
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver Instagram
                  </a>
                </p>
              )}
              {settings.facebook_url && (
                <p>
                  <span>Facebook</span>
                  <a href={settings.facebook_url} target="_blank" rel="noreferrer">
                    Ver Facebook
                  </a>
                </p>
              )}
              {settings.whatsapp_url && (
                <p>
                  <span>WhatsApp</span>
                  <a href={settings.whatsapp_url} target="_blank" rel="noreferrer">
                    Escribir por WhatsApp
                  </a>
                </p>
              )}
              {settings.artist_location && (
                <p>
                  <span>Ubicación</span>
                  {settings.artist_location}
                </p>
              )}
            </div>
          )}
        </div>

        <form className="contact-form" onSubmit={submitContact}>
          <input
            aria-hidden="true"
            autoComplete="off"
            className="contact-honeypot"
            name="website"
            tabIndex={-1}
            type="text"
          />
          <label>
            Nombre
            <input name="name" type="text" placeholder="Tu nombre" required />
          </label>
          <fieldset className="interest-field">
            <legend>Me interesa</legend>
            <div className="interest-options">
              {contactInterestOptions.map((option, index) => (
                <label className="interest-option" key={option}>
                  <input
                    defaultChecked={index === 0}
                    name="interest"
                    type="radio"
                    value={option}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            Mensaje
            <textarea
              name="message"
              rows={5}
              minLength={10}
              maxLength={3000}
              placeholder="Contame brevemente tu idea..."
              required
            />
          </label>
          <button
            className={`button button-primary contact-submit is-${contactStatus}`}
            disabled={contactStatus === "sending"}
            type="submit"
          >
            <span className="brush-pass" aria-hidden="true">
              <span />
            </span>
            <span className="paint-line" aria-hidden="true" />
            <span className="submit-label">
              {contactStatus === "sending"
                ? "Abriendo WhatsApp..."
                : "Enviar por WhatsApp"}
            </span>
          </button>
          {contactMessage && (
            <p
              className={
                contactStatus === "error" ? "form-error" : "form-success"
              }
              role="status"
            >
              {contactMessage}
            </p>
          )}
        </form>
      </section>

      </main>

      <footer>
        <a className="brand" href="#inicio">
          {settings.artist_name}
        </a>
        <p>Arte realista · Obras originales · Retratos por encargo</p>
        <div className="footer-meta">
          <p>© 2026 · Todos los derechos reservados</p>
          <a className="admin-access" href="/admin/">Administrar sitio</a>
        </div>
      </footer>
    </>
  );
}
