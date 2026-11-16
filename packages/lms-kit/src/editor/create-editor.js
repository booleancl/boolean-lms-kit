import { EditorView, basicSetup } from "codemirror"

/**
 * Monta un editor CodeMirror 6 sobre el markup del layout `lms-editor`.
 *
 * @param {object} opts
 * @param {import("@codemirror/state").Extension} opts.language  extensión de lenguaje (python(), javascript()…)
 * @param {{init?: (out: Output, root: HTMLElement) => Promise<void>|void,
 *          run: (code: string, out: Output) => Promise<void>|void,
 *          reset?: (out: Output) => Promise<void>|void}} opts.runner
 *   `reset` se llama con el botón Reset (p. ej. para recrear la base de datos SQL).
 * @param {HTMLElement|string} [opts.root="#lms-editor"]
 *
 * @typedef {{stdout: (text: string) => void, stderr: (text: string) => void, clear: () => void,
 *            table: (columns: string[], rows: unknown[][], note?: string) => void}} Output
 */
export function createEditor({ language, runner, root = "#lms-editor" }) {
  const el = typeof root === "string" ? document.querySelector(root) : root
  if (!el) throw new Error(`lms-kit: no se encontró ${root}`)

  const cells = [...el.querySelectorAll(".lms-cell")].map((pre, i) => ({
    title: pre.dataset.title || `Ejemplo ${i + 1}`,
    code: pre.textContent,
  }))
  if (cells.length === 0) cells.push({ title: "Ejemplo 1", code: "" })

  const consoleEl = el.querySelector(".lms-console")
  const out = {
    stdout: (text) => append(text, "lms-out"),
    stderr: (text) => append(text, "lms-err"),
    clear: () => { consoleEl.textContent = "" },
    table: (columns, rows, note) => {
      const tbl = document.createElement("table")
      tbl.className = "lms-result"
      const head = tbl.createTHead().insertRow()
      for (const name of columns) head.append(Object.assign(document.createElement("th"), { textContent: name }))
      const body = tbl.createTBody()
      for (const row of rows) {
        const tr = body.insertRow()
        for (const v of row) {
          const td = tr.insertCell()
          td.textContent = v === null ? "NULL" : String(v)
          if (v === null) td.className = "lms-null"
          else if (typeof v === "number") td.className = "lms-num"
        }
      }
      const wrap = document.createElement("div")
      wrap.className = "lms-result-wrap"
      wrap.append(tbl)
      consoleEl.append(wrap)
      if (note) append(note, "lms-note")
      consoleEl.scrollTop = consoleEl.scrollHeight
    },
  }
  function append(text, cls) {
    const span = document.createElement("span")
    span.className = cls
    span.textContent = text.endsWith("\n") ? text : text + "\n"
    consoleEl.append(span)
    consoleEl.scrollTop = consoleEl.scrollHeight
  }

  const view = new EditorView({
    doc: cells[0].code,
    extensions: [basicSetup, language],
    parent: el.querySelector(".lms-code"),
  })

  let current = 0
  const setDoc = (code) =>
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } })

  // Pestañas: solo si hay más de una celda. El código editado se conserva al cambiar de pestaña.
  const tabsEl = el.querySelector(".lms-tabs")
  const edited = cells.map((c) => c.code)
  if (cells.length > 1) {
    cells.forEach((cell, i) => {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.className = "lms-tab"
      btn.role = "tab"
      btn.textContent = cell.title
      btn.setAttribute("aria-selected", String(i === 0))
      btn.addEventListener("click", () => {
        edited[current] = view.state.doc.toString()
        current = i
        setDoc(edited[i])
        tabsEl.querySelectorAll(".lms-tab").forEach((b, j) => b.setAttribute("aria-selected", String(j === i)))
      })
      tabsEl.append(btn)
    })
  }

  const runBtn = el.querySelector('[data-action="run"]')
  const ready = Promise.resolve(runner.init?.(out, el)).catch((err) => {
    out.stderr(`Error al inicializar: ${err?.message ?? err}`)
    throw err
  })
  runBtn.disabled = true
  ready.then(() => { runBtn.disabled = false }, () => {})

  async function run() {
    await ready
    runBtn.disabled = true
    try {
      await runner.run(view.state.doc.toString(), out)
    } catch (err) {
      out.stderr(String(err?.message ?? err))
    } finally {
      runBtn.disabled = false
    }
  }

  runBtn.addEventListener("click", run)
  el.querySelector('[data-action="reset"]').addEventListener("click", async () => {
    edited[current] = cells[current].code
    setDoc(cells[current].code)
    if (runner.reset) {
      await ready
      await runner.reset(out)
    }
  })
  el.querySelector('[data-action="clear"]').addEventListener("click", out.clear)
  view.contentDOM.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run() }
  })

  return { view, run, out }
}
