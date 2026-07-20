SET NAMES utf8mb4;

INSERT INTO categories (name, slug, sort_order) VALUES
  ('Paisajes', 'paisajes', 10),
  ('Retratos', 'retratos', 20),
  ('Naturaleza', 'naturaleza', 30)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order);

INSERT INTO works
  (category_id, title, slug, technique, width_cm, height_cm, availability_status, publication_status, visibility, is_featured, featured_order, published_at)
VALUES
  ((SELECT id FROM categories WHERE slug = 'paisajes'), 'Tarde en la cordillera', 'tarde-en-la-cordillera', 'Óleo sobre lienzo', 90, 120, 'available', 'published', 'public', 1, 10, NOW()),
  ((SELECT id FROM categories WHERE slug = 'retratos'), 'Luz serena', 'luz-serena', 'Óleo sobre lienzo', 60, 50, 'sold', 'published', 'public', 1, 20, NOW()),
  ((SELECT id FROM categories WHERE slug = 'naturaleza'), 'Silencio de otoño', 'silencio-de-otono', 'Óleo sobre tabla', 50, 40, 'available', 'published', 'public', 1, 30, NOW()),
  ((SELECT id FROM categories WHERE slug = 'retratos'), 'Raíces', 'raices', 'Óleo sobre lienzo', 70, 55, 'commission', 'published', 'public', 0, 40, NOW()),
  ((SELECT id FROM categories WHERE slug = 'paisajes'), 'Camino al viñedo', 'camino-al-vinedo', 'Óleo sobre lienzo', 65, 90, 'available', 'published', 'public', 0, 50, NOW()),
  ((SELECT id FROM categories WHERE slug = 'naturaleza'), 'Memoria de flores', 'memoria-de-flores', 'Técnica mixta', 55, 45, 'available', 'published', 'public', 0, 60, NOW())
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id), technique = VALUES(technique), width_cm = VALUES(width_cm),
  height_cm = VALUES(height_cm), availability_status = VALUES(availability_status),
  publication_status = VALUES(publication_status), visibility = VALUES(visibility);

INSERT INTO work_images (work_id, image_path, thumbnail_path, alt_text, is_cover, sort_order) VALUES
  ((SELECT id FROM works WHERE slug = 'tarde-en-la-cordillera'), '/art/hero-paisaje.webp', '/art/hero-paisaje.webp', 'Pintura realista de un paisaje de montaña y viñedos', 1, 10),
  ((SELECT id FROM works WHERE slug = 'luz-serena'), '/art/retrato-mujer.webp', '/art/retrato-mujer.webp', 'Retrato al óleo de una mujer de perfil', 1, 10),
  ((SELECT id FROM works WHERE slug = 'silencio-de-otono'), '/art/bodegon.webp', '/art/bodegon.webp', 'Bodegón realista de tonos cálidos', 1, 10),
  ((SELECT id FROM works WHERE slug = 'raices'), '/art/retrato-hombre.webp', '/art/retrato-hombre.webp', 'Retrato realista de un hombre', 1, 10),
  ((SELECT id FROM works WHERE slug = 'camino-al-vinedo'), '/art/paisaje-camino.webp', '/art/paisaje-camino.webp', 'Paisaje pintado de un camino entre viñedos', 1, 10),
  ((SELECT id FROM works WHERE slug = 'memoria-de-flores'), '/art/flores.webp', '/art/flores.webp', 'Pintura realista de flores en una composición serena', 1, 10)
ON DUPLICATE KEY UPDATE image_path = VALUES(image_path);

INSERT INTO settings (setting_key, setting_value) VALUES
  ('artist_name', 'Carina Donaire'),
  ('artist_bio', 'Texto de presentación a definir con la artista.'),
  ('artist_location', 'Mendoza, Argentina'),
  ('artist_photo', ''),
  ('contact_email', ''),
  ('notification_email', ''),
  ('recovery_email', ''),
  ('instagram_url', ''),
  ('facebook_url', ''),
  ('whatsapp_url', '')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
