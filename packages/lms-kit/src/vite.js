import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { searchForWorkspaceRoot } from "vite"

// Carpeta real del paquete (resuelve symlinks de workspaces / npm link).
const KIT_DIR = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."))

const DEFAULT_ENTRYPOINTS = {
  python: "lms-python",
  javascript: "lms-javascript",
  sql: "lms-sql",
  sheet: "lms-sheet",
  reveal: "lms-reveal",
  mindmap: "lms-mindmap",
}

const SOURCE_EXTS = [".js", ".mjs", ".ts", ".jsx", ".tsx"]

const OPTIMIZE_DEPS = [
  "codemirror",
  "@codemirror/lang-python",
  "@codemirror/lang-javascript",
  "@codemirror/lang-sql",
  "@formulajs/formulajs",
  "sql.js",
  "markmap-lib",
  "markmap-view",
  "reveal.js",
  "reveal.js/plugin/markdown/markdown.esm.js",
  "reveal.js/plugin/highlight/highlight.esm.js",
  "reveal.js/plugin/notes/notes.esm.js",
  "reveal.js/plugin/zoom/zoom.esm.js",
  "reveal.js/plugin/search/search.esm.js",
  "reveal.js/plugin/math/math.esm.js",
]

/**
 * Plugin de Vite que agrega los entrypoints del kit como módulos virtuales, para que el sitio
 * no tenga que crear archivos en `_frontend/entrypoints/`. Úsalo junto a vite-plugin-ruby:
 *
 *   plugins: [RubyPlugin(), lmsKit()]
 *
 * Si existe un archivo real con el mismo nombre (p. ej. `entrypoints/lms-python.js`), se usa ese.
 * Los nombres deben coincidir con `lms_kit.entrypoints` de `_config.yml`.
 *
 * @param {object} [options]
 * @param {{python?: string, javascript?: string, sql?: string, sheet?: string, reveal?: string, mindmap?: string}} [options.entrypoints]
 * @param {string} [options.entrypointsDir="entrypoints"]  igual que `entrypointsDir` de config/vite.json
 */
export default function lmsKit({ entrypoints = {}, entrypointsDir = "entrypoints" } = {}) {
  const names = { ...DEFAULT_ENTRYPOINTS, ...entrypoints }
  /** @type {Map<string, string>} ruta absoluta virtual -> código del módulo */
  const modules = new Map()
  /** @type {Map<string, string>} URL de dev ("/entrypoints/x.js") -> ruta absoluta virtual */
  const urls = new Map()

  return {
    name: "boolean-lms-kit:entrypoints",

    // `post`: corre después de vite-plugin-ruby, cuando `root` ya apunta a sourceCodeDir.
    config: {
      order: "post",
      handler(config) {
        const root = path.resolve(config.root ?? process.cwd())
        const dir = path.join(root, entrypointsDir)
        const input = {}

        for (const [runtime, name] of Object.entries(names)) {
          if (!name) continue
          if (SOURCE_EXTS.some((ext) => fs.existsSync(path.join(dir, name + ext)))) continue

          const key = `${entrypointsDir}/${name}.js`
          const file = path.join(dir, `${name}.js`)
          modules.set(file, `import "@booleancl/lms-kit/${runtime}"\n`)
          urls.set(`/${key}`, file)
          input[key] = file
        }

        const optionsKey = config.build?.rolldownOptions ? "rolldownOptions" : "rollupOptions"
        return {
          build: { [optionsKey]: { input } },
          // Vite no escanea módulos virtuales: sin esto, en dev no pre-empaqueta CodeMirror ni reveal.
          optimizeDeps: { include: OPTIMIZE_DEPS.map((dep) => `@booleancl/lms-kit > ${dep}`) },
          // Si el kit está enlazado (workspace, `npm link`), sus archivos quedan fuera de la raíz del
          // sitio y el dev server los rechaza. Definir `allow` reemplaza el default, por eso se repite.
          server: { fs: { allow: [searchForWorkspaceRoot(root), KIT_DIR] } },
        }
      },
    },

    resolveId(id) {
      const clean = id.split("?")[0]
      if (modules.has(clean)) return clean
      if (urls.has(clean)) return urls.get(clean)
    },

    load(id) {
      return modules.get(id.split("?")[0])
    },
  }
}
