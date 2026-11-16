import { Sheet, colName, isError, refName, toText } from "./engine.js"
import { parseCSV, toCSV } from "./csv.js"

/**
 * Monta una planilla editable sobre el markup del layout `lms-sheet`.
 * Teclado: flechas para moverse, Enter/F2 o escribir para editar, Enter/Tab para confirmar,
 * Escape para cancelar, Supr/Retroceso para borrar.
 */
export function createSheet({ root = "#lms-sheet" } = {}) {
  const el = typeof root === "string" ? document.querySelector(root) : root
  if (!el) throw new Error(`lms-kit: no se encontró ${root}`)

  const locale = document.documentElement.lang || "es"
  const delimiter = el.dataset.delimiter || ","
  const source = el.querySelector(".lms-sheet-data")?.textContent ?? ""
  const initial = parseCSV(source, delimiter)

  const table = el.querySelector(".lms-grid")
  const nameBox = el.querySelector(".lms-cell-name")
  const formulaInput = el.querySelector(".lms-formula-input")

  let sheet
  let rows
  let cols
  let sel = { row: 0, col: 0 }
  let editor = null // { input, row, col }

  function load(data) {
    sheet = new Sheet(data, { locale })
    const { rows: r, cols: c } = sheet.size
    rows = Math.max(r + 3, 12)
    cols = Math.max(c + 2, 6)
    build()
    select(0, 0)
  }

  // --- render -------------------------------------------------------------

  function build() {
    const head = `<tr><th class="lms-corner"></th>${Array.from({ length: cols }, (_, c) => `<th scope="col">${colName(c)}</th>`).join("")}</tr>`
    const body = Array.from({ length: rows }, (_, r) =>
      `<tr><th scope="row">${r + 1}</th>${Array.from({ length: cols }, (_, c) => `<td data-row="${r}" data-col="${c}"></td>`).join("")}</tr>`
    ).join("")
    table.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`
    renderValues()
  }

  const cellEl = (row, col) => table.querySelector(`td[data-row="${row}"][data-col="${col}"]`)

  function renderValues() {
    for (const td of table.querySelectorAll("td")) {
      if (editor && td.contains(editor.input)) continue
      const row = Number(td.dataset.row)
      const col = Number(td.dataset.col)
      const value = sheet.get(row, col)
      td.className = ""
      td.removeAttribute("title")
      if (isError(value)) {
        td.textContent = value.code
        td.classList.add("lms-error")
        if (value.message) td.title = value.message
      } else {
        td.textContent = toText(value, locale)
        if (typeof value === "number" || value instanceof Date) td.classList.add("lms-num")
        if (typeof value === "boolean") td.classList.add("lms-bool")
      }
      if (sheet.getRaw(row, col).startsWith("=")) td.classList.add("lms-formula")
    }
    markSelection()
  }

  function markSelection() {
    table.querySelector("td.lms-selected")?.classList.remove("lms-selected")
    table.querySelectorAll("th.lms-active").forEach((th) => th.classList.remove("lms-active"))
    const td = cellEl(sel.row, sel.col)
    td?.classList.add("lms-selected")
    table.tHead.rows[0].cells[sel.col + 1]?.classList.add("lms-active")
    table.tBodies[0].rows[sel.row]?.cells[0].classList.add("lms-active")
  }

  // --- selección y edición ---------------------------------------------------

  function select(row, col) {
    if (row >= rows - 1) { rows++; build() }
    if (col >= cols - 1) { cols++; build() }
    sel = { row: Math.max(0, row), col: Math.max(0, col) }
    nameBox.textContent = refName(sel.row, sel.col)
    formulaInput.value = sheet.getRaw(sel.row, sel.col)
    markSelection()
    cellEl(sel.row, sel.col)?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }

  function startEdit(initialText) {
    if (editor) return
    const td = cellEl(sel.row, sel.col)
    const input = document.createElement("input")
    input.className = "lms-cell-input"
    input.value = initialText ?? sheet.getRaw(sel.row, sel.col)
    input.setAttribute("aria-label", `Editar ${refName(sel.row, sel.col)}`)
    td.textContent = ""
    td.append(input)
    editor = { input, row: sel.row, col: sel.col }
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
    input.addEventListener("input", () => { formulaInput.value = input.value })
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(input.value); move(e.shiftKey ? -1 : 1, 0) }
      else if (e.key === "Tab") { e.preventDefault(); commit(input.value); move(0, e.shiftKey ? -1 : 1) }
      else if (e.key === "Escape") { e.preventDefault(); cancel() }
    })
    input.addEventListener("blur", () => { if (editor?.input === input) commit(input.value, false) })
  }

  function commit(value, refocus = true) {
    const target = editor ?? sel
    editor = null
    sheet.set(target.row, target.col, value)
    renderValues()
    formulaInput.value = sheet.getRaw(sel.row, sel.col)
    if (refocus) table.focus()
  }

  function cancel() {
    editor = null
    renderValues()
    formulaInput.value = sheet.getRaw(sel.row, sel.col)
    table.focus()
  }

  function move(dr, dc) {
    select(Math.min(sel.row + dr, rows - 1), Math.min(sel.col + dc, cols - 1))
  }

  // --- eventos ---------------------------------------------------------------

  table.tabIndex = 0
  table.addEventListener("mousedown", (e) => {
    const td = e.target.closest("td")
    if (!td || (editor && td.contains(editor.input))) return
    if (editor) commit(editor.input.value, false)
    select(Number(td.dataset.row), Number(td.dataset.col))
  })
  table.addEventListener("dblclick", (e) => { if (e.target.closest("td")) startEdit() })
  table.addEventListener("keydown", (e) => {
    if (editor) return
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (moves[e.key]) { e.preventDefault(); move(...moves[e.key]) }
    else if (e.key === "Tab") { e.preventDefault(); move(0, e.shiftKey ? -1 : 1) }
    else if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); startEdit() }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); commit("") }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); startEdit(e.key) }
  })

  formulaInput.addEventListener("input", () => {
    if (editor) editor.input.value = formulaInput.value
  })
  formulaInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); editor = null; commit(formulaInput.value) }
    else if (e.key === "Escape") { e.preventDefault(); cancel() }
  })

  el.querySelector('[data-action="reset"]')?.addEventListener("click", () => load(initial))
  el.querySelector('[data-action="download"]')?.addEventListener("click", () => {
    const { rows: r, cols: c } = sheet.size
    const data = Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => sheet.getRaw(i, j)))
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([toCSV(data, delimiter)], { type: "text/csv" }))
    a.download = `${el.dataset.filename || "planilla"}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  })

  load(initial)
  return { get sheet() { return sheet }, select }
}
