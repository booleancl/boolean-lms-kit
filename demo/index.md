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

## Diapositivas

`_slides/intro.md` → `{% raw %}{% slides intro.md %}{% endraw %}`

{% slides intro.md %}
