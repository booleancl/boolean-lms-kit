# boolean-lms-kit

Layouts, includes y frontend interactivo para sitios LMS Jamstack con Jekyll
(just-the-docs + jekyll-vite). MIT © Academia Boolean SpA.

Los ejemplos se escriben **en archivos de su lenguaje**, con celdas estilo Jupytext:

```python
# title: Variables

# %% Asignación
x = 1
print(x)

# %% Otra pestaña
print(x + 1)
```

Cada archivo de `_examples/` se convierte en una página `/interactive/<ruta>.html` con un editor
CodeMirror y un botón Run (Python con Pyodide, JavaScript en el navegador). Cada celda es una pestaña.

## Paquetes

| Carpeta | Paquete | Contenido |
| --- | --- | --- |
| `packages/jekyll-boolean-lms-kit` | gem `jekyll-boolean-lms-kit` | generator, Liquid tags, layouts `lms-editor` / `lms-reveal` / `lms-katex`, includes |
| `packages/lms-kit` | npm `@boolean/lms-kit` | editor CodeMirror 6, runners (Pyodide, JS), init de reveal.js, plugin de Vite |
| `demo/` | — | sitio de ejemplo y documentación |

## Uso en un sitio Jekyll

1. `Gemfile`, en el grupo `:jekyll_plugins`: `gem "jekyll-boolean-lms-kit"`, y en `_config.yml`:
   ```yaml
   plugins: [jekyll/vite, jekyll-boolean-lms-kit]
   lms_kit:                     # todo opcional; estos son los valores por defecto
     source: _examples
     url_prefix: /interactive
     slides_source: _slides
     slides_prefix: /slides
     pyodide_version: "0.26.4"
     entrypoints: { python: lms-python, javascript: lms-javascript, reveal: lms-reveal }
   ```
2. `npm install @boolean/lms-kit` y agrega el plugin en `vite.config.ts` (es el único archivo de Vite que se toca):
   ```ts
   import { defineConfig } from 'vite'
   import RubyPlugin from 'vite-plugin-ruby'
   import lmsKit from '@boolean/lms-kit/vite'

   export default defineConfig({ plugins: [RubyPlugin(), lmsKit()] })
   ```
   El plugin crea los entrypoints `lms-python`, `lms-javascript` y `lms-reveal` como módulos virtuales:
   no hace falta crear archivos en `_frontend/entrypoints/`. Si quieres personalizar uno, crea el archivo real
   con ese nombre (p. ej. `_frontend/entrypoints/lms-python.js` con `import "@boolean/lms-kit/python"` y lo tuyo)
   y se usa ese. Si cambias los nombres en `lms_kit.entrypoints`, pásalos también al plugin:
   `lmsKit({ entrypoints: { python: "mi-python" } })`.
3. En cualquier página:
   ```liquid
   {% python_example python/hola.py %}
   {% js_example js/hola.js height=400 %}
   {% slides intro.md %}
   ```
   Todos respetan `site.baseurl`. Para fórmulas, usa `layout: lms-katex`.

Puedes sobrescribir cualquier layout o include del kit creando un archivo con el mismo nombre en el sitio
(p. ej. `_includes/lms-kit/iframe.html`).

## Desarrollo

```sh
npm install                       # raíz: workspaces (packages/lms-kit + demo)
cd packages/jekyll-boolean-lms-kit && bundle install && bundle exec rake test
cd demo && bundle install
bin/dev                           # Vite + Jekyll con overmind (requiere tmux) → http://localhost:4000
```

`bin/dev` usa `demo/Procfile.dev`. Con overmind: `bundle exec overmind connect jekyll` para ver un proceso,
`bundle exec overmind restart vite` para reiniciarlo, `bin/dev -D` para dejarlo en segundo plano y `bundle exec overmind quit` para detenerlo.

## Estado

v0.1 en curso: Python y JS desde archivos, generator, Liquid tags, reveal y KaTeX.
Para v0.2: ejemplos web HTML/CSS/JS (`{% web_example %}`, hoy es un stub), runner QuickJS y challenges con Jasmine.
