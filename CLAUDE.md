# boolean-lms-kit

Librería open source (MIT, Academia Boolean SpA) con los layouts, includes y frontend
interactivo usados en los sitios LMS Jamstack de Boolean. Extraída de `../intro-dev`
(Jekyll + just-the-docs + jekyll-vite).

## Objetivo

Reutilizar en varios sitios Jekyll:
- Editores interactivos de Python (Pyodide) y JavaScript (QuickJS / navegador) con CodeMirror 6.
- Ejercicios web HTML/CSS/JS con salida en iframe (hoy: MDN BOB `editor-tabbed.js`).
- Diapositivas reveal.js desde Markdown.
- Shortcodes que insertan un iframe con la página interactiva + botón "Full Screen".
- KaTeX opcional.

Mejora principal: **el código se escribe en archivos de su lenguaje** (`.py`, `.js`,
carpeta con `index.html`/`style.css`/`script.js`), no embebido en HTML ni front matter.

## Arquitectura

Dos paquetes en este monorepo:

1. **Gem `jekyll-boolean-lms-kit`** (plugin, NO theme — los sitios ya usan just-the-docs)
   - Hook `:after_init`/`:post_read`: agrega su `_includes/` a `site.includes_load_paths`
     y registra sus layouts en `site.layouts`.
   - Generator: recorre una carpeta configurable (ej. `_examples/`) y crea una página por
     archivo `.py`/`.js`/carpeta web, usando el layout correspondiente.
   - Formato de ejemplos: celdas separadas por `# %%` (py) / `// %%` (js), estilo Jupytext;
     metadatos en comentarios al inicio (`# title: ...`).
   - Liquid tags: `{% python_example ruta.py %}`, `{% js_example ruta.js height=400 %}`,
     `{% web_example carpeta/ %}`, `{% slides ruta.md %}`. Respetar siempre `site.baseurl`.
   - Config en `_config.yml` bajo la clave `lms_kit:` (carpeta fuente, prefijo de URL, etc.).

2. **Paquete npm `@boolean/lms-kit`** (nombre de scope por confirmar)
   - Un solo editor CodeMirror parametrizado por lenguaje + runners (pyodide, quickjs, iframe).
   - Un único layout web con `runtime: script | module | react` (reemplaza 3 layouts duplicados).
   - Plugin de Vite `@boolean/lms-kit/vite` (`lmsKit()`): crea los entrypoints `lms-python`/`lms-javascript`/
     `lms-reveal` como módulos virtuales; el sitio solo edita `vite.config.ts`. Un archivo real con el mismo
     nombre en `_frontend/entrypoints/` tiene prioridad.

`demo/`: sitio Jekyll mínimo (just-the-docs + jekyll-vite) que consume ambos paquetes por
ruta local; sirve de documentación y de prueba.

## Alcance v0.1

- Python y JS desde archivos, generator, Liquid tags, reveal, KaTeX.
- SQL (SQLite con sql.js; `-- schema:` / `-- db:`) y planilla desde `.csv` (motor de fórmulas propio en
  `packages/lms-kit/src/sheet/` + funciones de formulajs, nombres en español e inglés). No usar
  HyperFormula/Handsontable: sus licencias (GPL/comercial) no son compatibles con distribuir el kit como MIT.
- Después (v0.2): editor web de pestañas (reemplazar/reescribir BOB; conservar su licencia
  si se mantiene) y challenges con Jasmine (`is_challenge`, `test_files`).

## Origen en intro-dev (para migrar)

- `_layouts/python-editor.html`, `js-editor.html` + `_frontend/entrypoints/python.js`,
  `javascript.js` (casi idénticos → unificar).
- `_layouts/interactive-html.html`, `interactive-js-modules.html`, `interactive-react.html`
  + `_frontend/js/editor-tabbed.js` (bundle webpack de mdn/bob).
- `_layouts/reveal.html` + `_frontend/entrypoints/reveal.js`.
- `_includes/interactive-iframe.html`, `slides.html`, `katex.html`.
- Contenido: `interactive/06-python/**`, `interactive/08-js/**` (`<code class="static-py|static-js">`).

Bugs conocidos a no replicar:
- `katex.html` carga `/just-the-docs-tests/assets/js/mathtex-script-type.js` (ruta errónea).
- Páginas con `layout: interactive` (no existe).
- `interactive-iframe.html` no usa `site.baseurl`; `js-editor` tiene `alt="python logo"`.

## Migración de sitios

Script (rake) que convierte los `.html` con bloques `static-py`/`static-js` en `.py`/`.js`
con celdas `# %%`, manteniendo las URLs `/interactive/...` para no romper iframes existentes.
Primer sitio a migrar: `../intro-dev`.

## Notas de implementación

- `Jekyll::Layout` siempre resuelve la ruta dentro de `site.source`, por eso el gem usa `GemLayout`
  (`hooks.rb`) para leer los layouts desde su propia carpeta.
- No uses `{% vite_javascript_tag {{ var }} %}` en layouts compartidos: jekyll-vite 3.0.4 guarda el nombre
  resuelto la primera vez y lo reutiliza en todas las páginas. Para eso está `{% lms_entrypoint python %}`.
- El plugin de Vite (`packages/lms-kit/src/vite.js`) agrega `optimizeDeps.include` (Vite no escanea módulos
  virtuales) y `server.fs.allow` con la carpeta del kit (si está enlazado por symlink, el dev server la rechaza con 403).
- Prueba de punta a punta: `cd demo && bin/vite build && bundle exec jekyll build`, y luego servir `_site/`.
