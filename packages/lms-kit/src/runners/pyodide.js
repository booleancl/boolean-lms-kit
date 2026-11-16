/**
 * Runner de Python con Pyodide cargado desde el CDN de jsDelivr.
 * La versión sale de `data-pyodide-version` del contenedor (config `lms_kit.pyodide_version`).
 */
const DEFAULT_VERSION = "0.26.4"

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.head.append(s)
  })
}

export function pyodideRunner({ version } = {}) {
  let pyodide

  return {
    async init(out, root) {
      const v = version || root?.dataset.pyodideVersion || DEFAULT_VERSION
      const indexURL = `https://cdn.jsdelivr.net/pyodide/v${v}/full/`
      out.stdout("Cargando Python…")
      if (!globalThis.loadPyodide) await loadScript(`${indexURL}pyodide.js`)
      pyodide = await globalThis.loadPyodide({ indexURL })
      out.clear()
      out.stdout(`Python ${pyodide.runPython("import sys; sys.version.split()[0]")} listo.`)
    },

    async run(code, out) {
      pyodide.setStdout({ batched: (s) => out.stdout(s) })
      pyodide.setStderr({ batched: (s) => out.stderr(s) })
      try {
        await pyodide.loadPackagesFromImports(code)
        await pyodide.runPythonAsync(code)
      } catch (err) {
        // Muestra solo el traceback de Python, sin el stack de JS.
        out.stderr(err.type ? err.message : String(err))
      }
    },
  }
}
