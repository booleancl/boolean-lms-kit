CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad TEXT
);

CREATE TABLE productos (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio INTEGER NOT NULL
);

CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  producto_id INTEGER REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  fecha DATE NOT NULL
);

INSERT INTO clientes (nombre, ciudad) VALUES
  ('Ana', 'Santiago'), ('Benjamín', 'Valparaíso'), ('Camila', 'Concepción'), ('Diego', 'Santiago');

INSERT INTO productos (nombre, precio) VALUES
  ('Cuaderno', 2500), ('Lápiz', 500), ('Mochila', 18990), ('Calculadora', 12990);

INSERT INTO pedidos (cliente_id, producto_id, cantidad, fecha) VALUES
  (1, 1, 3, '2026-03-02'), (1, 2, 10, '2026-03-02'), (2, 3, 1, '2026-03-05'),
  (3, 4, 1, '2026-03-07'), (4, 1, 2, '2026-03-10'), (4, 3, 1, '2026-03-12');
