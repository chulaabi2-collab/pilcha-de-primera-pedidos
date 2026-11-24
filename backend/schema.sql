CREATE TABLE IF NOT EXISTS prendas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio INTEGER NOT NULL CHECK (precio > 0),
  stock INTEGER NOT NULL CHECK (stock >= 0)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  prenda_id INTEGER NOT NULL REFERENCES prendas(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  cliente TEXT NOT NULL,
  email TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  descuento INTEGER NOT NULL,
  envio INTEGER NOT NULL,
  total INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'reservado',
  penalidad INTEGER NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  vence_en TIMESTAMPTZ NOT NULL,
  pagado_en TIMESTAMPTZ
);
