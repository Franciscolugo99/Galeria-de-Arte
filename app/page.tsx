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
  medium: string;
  size: string;
  status: string;
}

interface SiteSettings {
  artist_name: string;
  artist_bio: string;
  artist_location: string;
  artist_photo: string;
  contact_email: string;
  instagram_url: string;
  facebook_url: string;
  whatsapp_url: string;
}

const defaultSettings: SiteSettings = {
  artist_name: "Carina Donaire",
  artist_bio: "Texto de presentación a definir con la artista.",
  artist_location: "Mendoza, Argentina",
  artist_photo: "",
  contact_email: "",
  instagram_url: "",
  facebook_url: "",
  whatsapp_url: "",
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

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<Category>("Todas");
  const [contactStatus, setContactStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [contactMessage, setContactMessage] = useState("");
  const [works, setWorks] = useState<Work[]>([]);
  const [catalogMessage, setCatalogMessage] = useState("Cargando obras…");
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
        setSettings({ ...defaultSettings, ...payload.settings });
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
    if (!menuOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

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

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setContactStatus("sending");
    setContactMessage("Enviando consulta...");
    try {
      const response = await fetch("/api/contact.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "No pudimos enviar la consulta.");
      }
      setContactStatus("sent");
      setContactMessage(
        payload.message ||
          "Gracias. Recibimos tu consulta y te vamos a responder por correo.",
      );
      form.reset();
    } catch (error) {
      setContactStatus("error");
      setContactMessage(
        error instanceof Error
          ? error.message
          : "No pudimos enviar la consulta. Intentá nuevamente.",
      );
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Ir al inicio">
          {settings.artist_name}
        </a>
        <button
          className={menuOpen ? "menu-button is-open" : "menu-button"}
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="navegacion-principal"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
        <nav
          id="navegacion-principal"
          className={menuOpen ? "main-nav is-open" : "main-nav"}
        >
          {navLinks.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy reveal reveal-delay">
          <p className="eyebrow">Carina Donaire · Artista visual</p>
          <h1>
            Arte que conserva una <em>historia</em>
          </h1>
          <span className="brush-stroke" aria-hidden="true" />
          <p className="hero-intro">
            Obras originales creadas a mano: composiciones figurativas,
            naturaleza y búsquedas abstractas donde cada pincelada conserva
            una historia.
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
              src="/art/obras-reales/contexto/artista-con-follaje-y-ave.webp"
              alt="Carina Donaire junto a una pintura de follaje tropical y un ave"
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <div className="hero-portrait">
            <img
              src="/art/obras-reales/uvas-borgona-vertical.webp"
              alt="Pintura vertical de uvas en tonos borgoña y violeta"
              decoding="async"
              loading="eager"
            />
            <span>Obra original</span>
          </div>
          <p className="hero-note">Carina junto a una de sus obras</p>
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
        <div className={settings.artist_photo ? "intro-grid has-photo" : "intro-grid"}>
          <h2>Pintar lo que una fotografía no puede contar.</h2>
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
            {settings.artist_bio.trim() &&
              settings.artist_bio.split(/\n+/).map((paragraph) => (
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
          {visibleWorks.map((work, index) => (
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
                    alt={work.altText || `${work.title}, ${work.medium}`}
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
                  <p className="work-specs">
                    <span>{work.medium}</span>
                    <span>{work.size}</span>
                  </p>
                </div>
              </button>
            </article>
          ))}
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
              <p className="lightbox-specs">
                {selectedWork.medium} · {selectedWork.size}
              </p>
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
            src="/art/retrato-hombre.webp"
            alt="Retrato realista pintado al óleo"
            decoding="async"
            loading="lazy"
          />
        </div>
        <div className="commission-content scroll-reveal">
          <p className="section-kicker">Obras por encargo</p>
          <h2>Un retrato creado especialmente para vos.</h2>
          <p className="commission-lead">
            Personas, familias, mascotas o paisajes significativos. La
            información final sobre técnicas, formatos y plazos se completará
            cuando la artista comparta sus condiciones reales de trabajo.
          </p>
          <ol className="steps">
            {[
              [
                "01",
                "Contame tu idea",
                "Enviame las fotografías de referencia y el tipo de obra que imaginás.",
              ],
              [
                "02",
                "Definimos la obra",
                "Acordamos composición, formato y condiciones antes de iniciar la pintura.",
              ],
              [
                "03",
                "Comienza la pintura",
                "El seguimiento del proceso se ajustará al modo de trabajo real de la artista.",
              ],
            ].map(([number, title, description], index) => (
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
          <h2>¿Tenés una historia que te gustaría convertir en arte?</h2>
          <p>
            Escribí para consultar por obras disponibles, retratos
            personalizados o una pieza pensada especialmente para un recuerdo.
          </p>
          {(settings.contact_email ||
            settings.instagram_url ||
            settings.facebook_url ||
            settings.whatsapp_url ||
            settings.artist_location) && (
            <div className="contact-details">
              {settings.contact_email && (
                <p>
                  <span>Correo</span>
                  <a href={`mailto:${settings.contact_email}`}>
                    {settings.contact_email}
                  </a>
                </p>
              )}
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
          <label>
            Correo
            <input
              name="email"
              type="email"
              placeholder="tunombre@email.com"
              required
            />
          </label>
          <label>
            Me interesa
            <select name="interest" defaultValue="">
              <option value="" disabled>
                Seleccioná una opción
              </option>
              <option>Encargar un retrato</option>
              <option>Comprar una obra disponible</option>
              <option>Realizar otra consulta</option>
            </select>
          </label>
          <label>
            Mensaje
            <textarea
              name="message"
              rows={5}
              placeholder="Contame brevemente tu idea..."
              required
            />
          </label>
          <button
            className="button button-primary"
            disabled={contactStatus === "sending"}
            type="submit"
          >
            {contactStatus === "sending" ? "Enviando..." : "Enviar consulta"}
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
    </main>
  );
}
