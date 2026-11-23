import { Transformer } from "markmap-lib"
import { Markmap, deriveOptions, loadCSS, loadJS } from "markmap-view"

const THEMES = ["light", "dark", "minimal"]

/**
 * Convierte las opciones del front matter (`markmap:`) en opciones de Markmap.
 * `wrapWidth` es alias de `maxWidth`; `theme` y `layout` los maneja el kit; el resto son
 * las opciones nativas de markmap (colorFreezeLevel, initialExpandLevel, duration, color, ...).
 */
export function resolveOptions(raw = {}) {
  const { theme = "light", layout = "right", wrapWidth, ...rest } = raw
  if (wrapWidth != null && rest.maxWidth == null) rest.maxWidth = wrapWidth

  if (!THEMES.includes(theme)) console.warn(`lms-kit: tema de mindmap desconocido "${theme}" (${THEMES.join(", ")})`)
  if (layout !== "right") console.warn(`lms-kit: layout de mindmap "${layout}" no soportado; se usa "right"`)

  const options = deriveOptions(rest)
  if (theme === "minimal" && rest.color == null) options.color = () => "#6e7781"
  return { theme: THEMES.includes(theme) ? theme : "light", options }
}

export function createMindmap(root = document.getElementById("lms-mindmap")) {
  if (!root) return
  const svg = root.querySelector("svg")
  const source = root.querySelector(".lms-mindmap-data")?.textContent ?? ""
  let raw = {}
  try {
    raw = JSON.parse(root.dataset.options || "{}") || {}
  } catch (e) {
    console.warn("lms-kit: opciones de mindmap inválidas", e)
  }

  const { theme, options } = resolveOptions(raw)
  root.dataset.theme = theme
  document.documentElement.dataset.lmsMindmapTheme = theme

  const transformer = new Transformer()
  const { root: tree, features } = transformer.transform(source)
  const assets = transformer.getUsedAssets(features)
  if (assets.styles) loadCSS(assets.styles)

  const map = Markmap.create(svg, options, tree)
  if (assets.scripts) loadJS(assets.scripts, { getMarkmap: () => ({ Markmap, deriveOptions }) })

  root.querySelector('[data-action="fit"]')?.addEventListener("click", () => map.fit())
  return map
}
