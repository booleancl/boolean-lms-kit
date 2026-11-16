-- title: Consultas a una tienda
-- schema: _schemas/tienda.sql

-- %% SELECT
SELECT * FROM productos;

-- %% WHERE y ORDER BY
SELECT nombre, precio
FROM productos
WHERE precio > 1000
ORDER BY precio DESC;

-- %% JOIN y GROUP BY
SELECT c.nombre AS cliente, SUM(p.precio * pe.cantidad) AS total
FROM pedidos pe
JOIN clientes c ON c.id = pe.cliente_id
JOIN productos p ON p.id = pe.producto_id
GROUP BY c.nombre
ORDER BY total DESC;

-- %% INSERT
INSERT INTO clientes (nombre, ciudad) VALUES ('Elena', 'Temuco');
SELECT * FROM clientes;
