SET NAMES utf8mb4;

INSERT INTO categories (name, slug, sort_order) VALUES
  ('Naturaleza', 'naturaleza', 10),
  ('Bodegones', 'bodegones', 20),
  ('Abstractas', 'abstractas', 30),
  ('Figurativas', 'figurativas', 40)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order);

INSERT INTO works
  (category_id, title, slug, description, technique, width_cm, height_cm, availability_status, publication_status, visibility, is_featured, featured_order, published_at)
VALUES
  ((SELECT id FROM categories WHERE slug = 'naturaleza'), 'Follaje y ave', 'follaje-y-ave', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 1, 10, NOW()),
  ((SELECT id FROM categories WHERE slug = 'bodegones'), 'Uvas borgoña', 'uvas-borgona', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 1, 20, NOW()),
  ((SELECT id FROM categories WHERE slug = 'abstractas'), 'Azul y tierra', 'azul-y-tierra', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 1, 30, NOW()),
  ((SELECT id FROM categories WHERE slug = 'abstractas'), 'Trazos claros', 'trazos-claros', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 0, 40, NOW()),
  ((SELECT id FROM categories WHERE slug = 'bodegones'), 'Uvas sobre azul', 'uvas-sobre-azul', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 0, 50, NOW()),
  ((SELECT id FROM categories WHERE slug = 'figurativas'), 'Mujeres y calas', 'mujeres-y-calas', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 0, 60, NOW()),
  ((SELECT id FROM categories WHERE slug = 'figurativas'), 'Composición Alemania–Argentina', 'composicion-alemania-argentina', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 0, 70, NOW()),
  ((SELECT id FROM categories WHERE slug = 'naturaleza'), 'Ventana turquesa', 'ventana-turquesa', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 0, 80, NOW()),
  ((SELECT id FROM categories WHERE slug = 'naturaleza'), 'Ramo en tierras', 'ramo-en-tierras', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 0, 90, NOW()),
  ((SELECT id FROM categories WHERE slug = 'figurativas'), 'Caballos en libertad', 'caballos-en-libertad', 'Título descriptivo provisorio.', NULL, NULL, NULL, 'consult', 'published', 'public', 0, 100, NOW())
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id), description = VALUES(description), technique = VALUES(technique),
  width_cm = VALUES(width_cm), height_cm = VALUES(height_cm), availability_status = VALUES(availability_status),
  publication_status = VALUES(publication_status), visibility = VALUES(visibility),
  is_featured = VALUES(is_featured), featured_order = VALUES(featured_order);

INSERT INTO work_images (work_id, image_path, thumbnail_path, alt_text, is_cover, sort_order) VALUES
  ((SELECT id FROM works WHERE slug = 'follaje-y-ave'), '/art/obras-reales/follaje-y-ave.webp', '/art/obras-reales/follaje-y-ave.webp', 'Pintura de grandes hojas tropicales en tonos verdes y azules con un ave amarilla en vuelo', 1, 10),
  ((SELECT id FROM works WHERE slug = 'uvas-borgona'), '/art/obras-reales/uvas-borgona-vertical.webp', '/art/obras-reales/uvas-borgona-vertical.webp', 'Pintura vertical de un racimo de uvas brillantes en tonos borgoña, rojo y violeta', 1, 10),
  ((SELECT id FROM works WHERE slug = 'azul-y-tierra'), '/art/obras-reales/abstracta-azul-y-tierra.webp', '/art/obras-reales/abstracta-azul-y-tierra.webp', 'Pintura abstracta vertical con texturas en azul, tierra, negro y pequeños acentos rojos', 1, 10),
  ((SELECT id FROM works WHERE slug = 'trazos-claros'), '/art/obras-reales/abstracta-clara.webp', '/art/obras-reales/abstracta-clara.webp', 'Pintura abstracta vertical en beige, blanco, amarillo y verde azulado atravesada por líneas curvas', 1, 10),
  ((SELECT id FROM works WHERE slug = 'uvas-sobre-azul'), '/art/obras-reales/catalogo/uvas-realistas-v2.webp', '/art/obras-reales/catalogo/uvas-realistas-v2.webp', 'Pintura realista horizontal de un racimo de uvas moradas sobre un fondo azul grisáceo', 1, 10),
  ((SELECT id FROM works WHERE slug = 'mujeres-y-calas'), '/art/obras-reales/catalogo/mujeres-y-calas.webp', '/art/obras-reales/catalogo/mujeres-y-calas.webp', 'Pintura figurativa de tres mujeres entre calas, vasijas y formas de colores cálidos', 1, 10),
  ((SELECT id FROM works WHERE slug = 'composicion-alemania-argentina'), '/art/obras-reales/nuevas/composicion-alemania-argentina.webp', '/art/obras-reales/nuevas/composicion-alemania-argentina.webp', 'Composición pictórica con paisajes, arquitectura, banderas de Alemania y Argentina, una guitarra y una jarra', 1, 10),
  ((SELECT id FROM works WHERE slug = 'ventana-turquesa'), '/art/obras-reales/nuevas/ventana-turquesa.webp', '/art/obras-reales/nuevas/ventana-turquesa.webp', 'Pintura de una ventana turquesa rodeada por macetas y flores de distintos colores', 1, 10),
  ((SELECT id FROM works WHERE slug = 'ramo-en-tierras'), '/art/obras-reales/nuevas/ramo-en-tierras.webp', '/art/obras-reales/nuevas/ramo-en-tierras.webp', 'Pintura de un ramo de flores blancas, ocres y amarillas sobre un fondo en tonos tierra', 1, 10),
  ((SELECT id FROM works WHERE slug = 'caballos-en-libertad'), '/art/obras-reales/nuevas/caballos-en-libertad.webp', '/art/obras-reales/nuevas/caballos-en-libertad.webp', 'Pintura de una manada de caballos corriendo sobre un paisaje en tonos amarillos y turquesa', 1, 10)
ON DUPLICATE KEY UPDATE thumbnail_path = VALUES(thumbnail_path), alt_text = VALUES(alt_text), is_cover = VALUES(is_cover);

INSERT INTO settings (setting_key, setting_value) VALUES
  ('artist_name', 'Carina Donaire'),
  ('artist_bio', 'Carina Donaire comparte en este espacio una selección de sus obras originales. La información sobre su recorrido y proceso artístico se completará próximamente.'),
  ('artist_location', 'Mendoza, Argentina'),
  ('artist_photo', ''),
  ('contact_email', ''),
  ('notification_email', ''),
  ('recovery_email', ''),
  ('instagram_url', ''),
  ('facebook_url', ''),
  ('whatsapp_url', '')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
