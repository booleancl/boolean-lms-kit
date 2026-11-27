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

Cada archivo de `_examples/` se convierte en una página `/interactive/<ruta>.html`:

| Archivo | Página | Celdas |
| --- | --- | --- |
| `.py` | editor + Python (Pyodide) | `# %%` |
| `.js` | editor + JavaScript en el navegador | `// %%` |
| `.sql` | editor + SQLite (sql.js), resultados en tabla | `-- %%` |
| `.csv` | planilla de cálculo editable con fórmulas | — |
| `.md` | mapa mental (markmap) | — |

Cada celda es una pestaña. Los archivos y carpetas que empiezan con `_` no generan página
(sirven para esquemas SQL o bases de datos compartidas).

### SQL

```sql
-- title: Consultas a una tienda
-- schema: _schemas/tienda.sql      (uno o más .sql separados por coma, se ejecutan al cargar)
-- db: _db/estudiantes.sqlite       (opcional: base SQLite existente, se publica junto a la página)

-- %% JOIN
SELECT c.nombre, SUM(p.precio) FROM pedidos ...
```

Las rutas son relativas al archivo y no pueden salir de `_examples/`. La base se mantiene entre
ejecuciones (un `INSERT` se acumula) y **Reset** la vuelve a crear.

### Planilla

```csv
# title: Notas del curso
Estudiante,Nota 1,Nota 2,Promedio
Ana,6.5,5.8,=PROMEDIO(B2:C2)
Benjamín,3.2,4.5,"=SI(PROMEDIO(B3:C3)>=4;""Aprobado"";""Reprobado"")"
```

- Las celdas que empiezan con `=` son fórmulas: referencias (`A1`, `$A$1`), rangos (`A1:C3`),
  operadores `+ - * / ^ & %` y comparaciones.
- Funciones en español (`SUMA`, `PROMEDIO`, `SI`, `CONTAR.SI`, `BUSCARV`, `BUSCARX`, `REDONDEAR`, `HOY`…)
  y en inglés (`SUM`, `AVERAGE`, `IF`, `COUNTIF`, `VLOOKUP`… y el resto de [formulajs](https://formulajs.info/functions/)).
  Los argumentos se separan con `;` o `,`. Los decimales usan punto (`6.5`).
- Una fórmula con `,` o `"` debe ir entre comillas, como en cualquier CSV (las comillas internas se duplican).
  Con `# delimiter: ;` el archivo usa `;` como separador de columnas.
- Valores: números, `50%`, `VERDADERO`/`FALSO`, fechas `2026-03-15`; `'123` fuerza texto.
- Errores como en Sheets/Excel: `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`, `#REF!` (incluye referencias circulares).
- Teclado: flechas, Enter/F2 o escribir para editar, Enter/Tab para confirmar, Esc para cancelar, Supr para borrar.
  "Descargar CSV" guarda la planilla con sus fórmulas (se puede abrir en Sheets o Excel).

### Cuestionarios

Cada `.yml` de `_quizzes/` genera una página `/quizzes/<ruta>.html`:

```yaml
- ae: 1                                    # opcional: aprendizaje esperado
  pregunta: ¿Qué cláusula filtra filas?
  opciones:                                # dos o más; exactamente una correcta
    - texto: WHERE
      feedback: Correcto.                  # opcional
      correcta: true
    - texto: ORDER BY
      feedback: Ordena, no filtra.
```

Para definir título, umbral o mensajes en un archivo, usa un mapa con las preguntas en `preguntas:`:

```yaml
title: Control de lectura
min_logro: 0.8                             # proporción mínima de respuestas correctas
mensaje_aprobado: ¡Bien hecho!
mensaje_repaso: Repasa la unidad y vuelve a intentarlo.
preguntas:
  - pregunta: ...
```

Los valores por defecto de `min_logro` y los mensajes se cambian en `_config.yml` con `lms_kit.quiz`.

```liquid
{% quiz sql/control.yml %}
{% quiz sql/control.yml ae=2 %}            <!-- solo las preguntas de ese aprendizaje -->
{% quiz sql/control.yml height=700 %}      <!-- altura fija; sin height se ajusta al contenido -->
```

Un archivo inválido se informa en la salida de Jekyll y no genera página; la compilación continúa.
Las respuestas correctas están en el HTML: sirve para autoevaluación, no para calificar.

Al revisar las respuestas, el cuestionario envía el resultado a la página que lo contiene:

```js
window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.data?.type !== "lms-kit:quiz-result") return
  const { quiz, ae, correct, total, score, passed } = event.data
})
```

El ajuste de altura lo hace `_includes/lms-kit/iframe.html`. Si tu sitio sobrescribe ese include,
actualízalo para conservarlo.

## Laboratorios

Tarjeta que enlaza el repositorio de partida de un laboratorio. A diferencia de las demás etiquetas, no
genera una página ni usa un iframe.

```liquid
{% lab nombre-del-repositorio %}
{% lab nombre-del-repositorio org=otra-organizacion host=gitlab.com %}
```

`org` y `host` por defecto son `booleancl` y `github.com`; se cambian en `_config.yml`:

```yaml
lms_kit:
  lab:
    org: mi-organizacion
```

El HTML y los estilos están en `_includes/lms-kit/lab.html`, que un sitio puede sobrescribir.

## Paginación

Enlaces **anterior / siguiente** que recorren las páginas en el orden del menú lateral de just-the-docs:
la portada y las páginas bajo `/docs/` que tienen `title` y no tienen `nav_exclude`.

just-the-docs define su propio `footer_custom.html`, que tiene prioridad sobre los includes de la gema, así
que el sitio debe incluirlos en su `_includes/footer_custom.html`:

```liquid
{% include lms-kit/page-nav.html %}
```

```yaml
lms_kit:
  pagination:
    root: /docs/
    prev_label: Atrás                  # opcional
    next_label: Siguiente              # opcional
    aria_label: Paginación del curso   # opcional
```

- La jerarquía se arma con `parent`, `grand_parent` y `ancestor`. Una página cuyo padre no existe queda fuera.
- El orden es `nav_order` (primero números, luego texto) y después el título. No se consideran
  `child_nav_order` ni otras opciones de orden de just-the-docs.
- No incluye colecciones.
- El color de los bordes se cambia con la variable CSS `--lms-nav-border`.
- `pagination: false` la desactiva.

## Paquetes

| Carpeta | Paquete | Contenido |
| --- | --- | --- |
| `packages/jekyll-boolean-lms-kit` | gem `jekyll-boolean-lms-kit` | generator, Liquid tags, paginación, tarjeta de laboratorio, layouts `lms-editor` / `lms-sheet` / `lms-mindmap` / `lms-reveal` / `lms-quiz` / `lms-katex`, includes |
| `packages/lms-kit` | npm `@booleancl/lms-kit` | editor CodeMirror 6, runners (Pyodide, JS, SQLite), planilla con motor de fórmulas, mapas mentales (markmap), cuestionarios, reveal.js, plugin de Vite |
| `demo/` | — | sitio de ejemplo y documentación |

## Uso en un sitio Jekyll

1. `Gemfile` (la gema se instala desde GitHub; `glob` le indica a Bundler dónde está el `.gemspec`):
   ```ruby
   group :jekyll_plugins do
     gem "jekyll-vite", "~> 3.0"
     gem "jekyll-boolean-lms-kit",
         git: "https://github.com/booleancl/boolean-lms-kit",
         glob: "packages/jekyll-boolean-lms-kit/*.gemspec",
         tag: "v0.1.4"
   end
   ```
   y en `_config.yml`:
   ```yaml
   plugins: [jekyll/vite, jekyll-boolean-lms-kit]
   lms_kit:                     # todo opcional; estos son los valores por defecto
     source: _examples
     url_prefix: /interactive
     slides_source: _slides
     slides_prefix: /slides
     quiz_source: _quizzes
     quiz_prefix: /quizzes
     quiz: { min_logro: 0.6 }   # además: mensaje_aprobado, mensaje_repaso
     pagination: { root: /docs/ }   # false la desactiva
     lab: { org: booleancl, host: github.com }
     pyodide_version: "0.26.4"
     entrypoints: { python: lms-python, javascript: lms-javascript, sql: lms-sql, sheet: lms-sheet, reveal: lms-reveal, mindmap: lms-mindmap, quiz: lms-quiz }
   ```
2. Instala el paquete npm desde [npm](https://www.npmjs.com/package/@booleancl/lms-kit)
   (usa la misma versión que el `tag` de la gema):
   ```sh
   npm install @booleancl/lms-kit@0.1.4
   ```
   y agrega el plugin en `vite.config.ts` (es el único archivo de Vite que se toca):
   ```ts
   import { defineConfig } from 'vite'
   import RubyPlugin from 'vite-plugin-ruby'
   import lmsKit from '@booleancl/lms-kit/vite'

   export default defineConfig({ plugins: [RubyPlugin(), lmsKit()] })
   ```
   El plugin crea los entrypoints `lms-python`, `lms-javascript`, `lms-sql`, `lms-sheet`, `lms-reveal`, `lms-mindmap` y `lms-quiz` como módulos virtuales:
   no hace falta crear archivos en `_frontend/entrypoints/`. Si quieres personalizar uno, crea el archivo real
   con ese nombre (p. ej. `_frontend/entrypoints/lms-python.js` con `import "@booleancl/lms-kit/python"` y lo tuyo)
   y se usa ese. Si cambias los nombres en `lms_kit.entrypoints`, pásalos también al plugin:
   `lmsKit({ entrypoints: { python: "mi-python" } })`.
3. En cualquier página:
   ```liquid
   {% python_example python/hola.py %}
   {% js_example js/hola.js height=400 %}
   {% sql_example sql/tienda.sql height=500 %}
   {% sheet_example planillas/notas.csv %}
   {% slides intro.md %}
   {% quiz lenguajes.yml %}      # un .yml en lms_kit.quiz_source

   # Mapas mentales: un .md en lms_kit.source (solo visualización)
   {% mindmap mapas/lenguajes.md height=500 %}
   ```
   Todos respetan `site.baseurl`. Para fórmulas, usa `layout: lms-katex`.

Puedes sobrescribir cualquier layout o include del kit creando un archivo con el mismo nombre en el sitio
(p. ej. `_includes/lms-kit/iframe.html`).

## Desarrollo

```sh
npm install                       # raíz: workspaces (packages/lms-kit + demo)
cd packages/jekyll-boolean-lms-kit && bundle install && bundle exec rake test
npm test -w @booleancl/lms-kit      # planilla y cuestionarios
cd demo && bundle install
bin/dev                           # Vite + Jekyll con overmind (requiere tmux) → http://localhost:4000
```

`bin/dev` usa `demo/Procfile.dev`. Con overmind: `bundle exec overmind connect jekyll` para ver un proceso,
`bundle exec overmind restart vite` para reiniciarlo, `bin/dev -D` para dejarlo en segundo plano y `bundle exec overmind quit` para detenerlo.

## Publicar una versión

1. Sube la versión en `packages/jekyll-boolean-lms-kit/lib/jekyll/boolean_lms_kit/version.rb` y en
   `packages/lms-kit/package.json` (deben coincidir).
2. Commit, `git tag -a vX.Y.Z -m vX.Y.Z` y `git push --follow-tags` (solo sube etiquetas anotadas).
3. El workflow `.github/workflows/release.yml` verifica las versiones, corre los tests y crea la GitHub Release
   con `booleancl-lms-kit-X.Y.Z.tgz` adjunto.
4. Publica el paquete npm: `cd packages/lms-kit && npm publish --access public` (requiere sesión o token con permiso
   sobre el scope `@booleancl`; con 2FA, usa `--otp=<código>` o un token granular con bypass 2FA).
5. Los sitios actualizan el `tag:` del `Gemfile` y la versión de `@booleancl/lms-kit` en `package.json`.
