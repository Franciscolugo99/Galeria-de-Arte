"use client";

import {
  type CSSProperties,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type Category = "Todas" | "Paisajes" | "Retratos" | "Naturaleza";
type RevealStyle = CSSProperties & { "--reveal-delay"?: string };

const works = [
  {
    title: "Tarde en la cordillera",
    category: "Paisajes" as const,
    image: "/art/hero-paisaje.webp",
    medium: "Óleo sobre lienzo",
    size: "90 x 120 cm",
    status: "Disponible",
  },
  {
    title: "Luz serena",
    category: "Retratos" as const,
    image: "/art/retrato-mujer.webp",
    medium: "Óleo sobre lienzo",
    size: "60 x 50 cm",
    status: "Colección privada",
  },
  {
    title: "Silencio de otoño",
    category: "Naturaleza" as const,
    image: "/art/bodegon.webp",
    medium: "Óleo sobre tabla",
    size: "50 x 40 cm",
    status: "Disponible",
  },
  {
    title: "Raíces",
    category: "Retratos" as const,
    image: "/art/retrato-hombre.webp",
    medium: "Óleo sobre lienzo",
    size: "70 x 55 cm",
    status: "Obra por encargo",
  },
  {
    title: "Camino al viñedo",
    category: "Paisajes" as const,
    image: "/art/paisaje-camino.webp",
    medium: "Óleo sobre lienzo",
    size: "65 x 90 cm",
    status: "Disponible",
  },
  {
    title: "Memoria de flores",
    category: "Naturaleza" as const,
    image: "/art/flores.webp",
    medium: "Técnica mixta",
    size: "55 x 45 cm",
    status: "Disponible",
  },
];

const categories: Category[] = ["Todas", "Paisajes", "Retratos", "Naturaleza"];

const navLinks = [
  ["Inicio", "#inicio"],
  ["Obras", "#obras"],
  ["Encargos", "#encargos"],
  ["Sobre mí", "#artista"],
  ["Contacto", "#contacto"],
];

function getRevealStyle(index: number): RevealStyle {
  return { "--reveal-delay": `${Math.min(index, 5) * 70}ms` };
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<Category>("Todas");
  const [sent, setSent] = useState(false);

  const visibleWorks = useMemo(
    () =>
      category === "Todas"
        ? works
        : works.filter((work) => work.category === category),
    [category],
  );

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
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
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
  }, [category]);

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
    event.currentTarget.reset();
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Ir al inicio">
          Nombre de la artista
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
          <p className="eyebrow">Pintura realista · Obra hecha a mano</p>
          <h1>
            Arte que conserva una <em>historia</em>
          </h1>
          <span className="brush-stroke" aria-hidden="true" />
          <p className="hero-intro">
            Retratos, paisajes y obras originales creadas para detener el
            tiempo y transformar recuerdos en piezas únicas.
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
              src="/art/hero-paisaje.webp"
              alt="Pintura realista de un paisaje de montaña y viñedos"
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <div className="hero-portrait">
            <img
              src="/art/retrato-mujer.webp"
              alt="Retrato al óleo de una mujer de perfil"
              decoding="async"
              loading="eager"
            />
            <span>Estudio de retrato</span>
          </div>
          <p className="hero-note">Cada pincelada, una memoria</p>
        </div>
      </section>

      <nav className="category-ribbon" aria-label="Categorías de obras">
        <a href="#obras" onClick={() => selectCategory("Paisajes")}>
          <span>01</span> Paisajes
        </a>
        <i aria-hidden="true">·</i>
        <a href="#obras" onClick={() => selectCategory("Retratos")}>
          <span>02</span> Retratos
        </a>
        <i aria-hidden="true">·</i>
        <a href="#obras" onClick={() => selectCategory("Naturaleza")}>
          <span>03</span> Naturaleza
        </a>
      </nav>

      <section className="intro section-shell scroll-reveal" id="artista">
        <p className="section-kicker">La obra</p>
        <div className="intro-grid">
          <h2>Pintar lo que una fotografía no puede contar.</h2>
          <div>
            <p>
              Este espacio reúne una selección provisoria de pinturas realistas,
              paisajes, retratos y obras de naturaleza mientras se incorpora el
              material definitivo de la artista.
            </p>
            <p>
              La web está preparada para reemplazar estos textos por biografía,
              técnica y obra real sin perder el tono editorial de la galería.
            </p>
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
          {visibleWorks.map((work, index) => (
            <article
              className={`work-card work-${index + 1} scroll-reveal`}
              key={work.title}
              style={getRevealStyle(index)}
            >
              <div className="work-image">
                <img
                  src={work.image}
                  alt={`${work.title}, ${work.medium}`}
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
                <p>
                  {work.medium}
                  <br />
                  {work.size}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

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
          <div className="contact-details">
            <p>
              <span>Correo</span>
              A definir
            </p>
            <p>
              <span>Instagram</span>
              A definir
            </p>
            <p>
              <span>Ubicación</span>
              Mendoza, Argentina
            </p>
          </div>
        </div>

        <form className="contact-form" onSubmit={submitContact}>
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
          <button className="button button-primary" type="submit">
            Enviar consulta
          </button>
          {sent && (
            <p className="form-success" role="status">
              Gracias. Este formulario es demostrativo y todavía no envía
              correos; queda listo para conectar el destino real.
            </p>
          )}
        </form>
      </section>

      <footer>
        <a className="brand" href="#inicio">
          Nombre de la artista
        </a>
        <p>Arte realista · Obras originales · Retratos por encargo</p>
        <p>© 2026 · Todos los derechos reservados</p>
      </footer>
    </main>
  );
}
