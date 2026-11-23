---
title: Inicio
nav_order: 1
---

# boolean-lms-kit

Layouts, includes y frontend interactivo para sitios LMS Jamstack con Jekyll.
El código de los ejemplos vive en archivos de su lenguaje dentro de `_examples/`.

## Python

`_examples/python/hola.py` → `{% raw %}{% python_example python/hola.py %}{% endraw %}`

{% python_example python/hola.py %}

## JavaScript

`_examples/js/hola.js` → `{% raw %}{% js_example js/hola.js height=400 %}{% endraw %}`

{% js_example js/hola.js height=400 %}

## SQL

Consultas sobre SQLite. El esquema y los datos vienen de otro archivo (`-- schema: _schemas/tienda.sql`);
la base se mantiene entre ejecuciones y **Reset** la vuelve a crear.

`_examples/sql/tienda.sql` → `{% raw %}{% sql_example sql/tienda.sql height=500 %}{% endraw %}`

{% sql_example sql/tienda.sql height=500 %}

También se puede partir de una base `.sqlite` existente con `-- db: _db/estudiantes.sqlite`:

{% sql_example sql/estudiantes.sql %}

## Planilla de cálculo

Un `.csv` donde las celdas que empiezan con `=` son fórmulas. Acepta funciones en español
(`SUMA`, `PROMEDIO`, `SI`, `BUSCARV`…) y en inglés (`SUM`, `AVERAGE`, `IF`, `VLOOKUP`…), con `;` o `,`.

`_examples/planillas/notas.csv` → `{% raw %}{% sheet_example planillas/notas.csv %}{% endraw %}`

{% sheet_example planillas/notas.csv %}

{% sheet_example planillas/ventas.csv height=380 %}

## Mapas mentales

Un `.md` en `_examples/` se muestra como mapa mental (markmap), solo para visualizar. El front matter
configura el mapa: `wrapWidth` (ancho máximo del texto), `theme` (`light`, `dark`, `minimal`) y cualquier
opción de markmap (`colorFreezeLevel`, `initialExpandLevel`, `duration`…).

`_examples/mapas/lenguajes.md` → `{% raw %}{% mindmap mapas/lenguajes.md height=500 %}{% endraw %}`

{% mindmap mapas/lenguajes.md height=500 %}

## Diapositivas

`_slides/intro.md` → `{% raw %}{% slides intro.md %}{% endraw %}`

{% slides intro.md %}
