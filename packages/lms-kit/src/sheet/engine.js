/**
 * Motor de fórmulas de la planilla: parser (Pratt) + evaluador con memo y detección de ciclos.
 * No depende del DOM, se puede probar en Node.
 *
 * Valores: number | string | boolean | null (celda vacía) | Date | FormulaError.
 * Los rangos (A1:B3) se pasan a las funciones como matrices 2D de esos valores.
 */
import { callFunction, isLazy, lookupFunction } from "./functions.js"

export class FormulaError {
  /** @param {string} code  "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#N/A", "#NUM!", "#ERROR!" */
  constructor(code, message = "") {
    this.code = code
    this.message = message
  }
  toString() {
    return this.code
  }
}

export const isError = (v) => v instanceof FormulaError

// ---------------------------------------------------------------------------
// Referencias A1

export function colName(index) {
  let name = ""
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

export function colIndex(name) {
  let n = 0
  for (const ch of name.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

const REF_RE = /^\$?([A-Za-z]{1,3})\$?(\d+)$/

export function parseRef(text) {
  const m = REF_RE.exec(text)
  if (!m) return null
  return { row: Number(m[2]) - 1, col: colIndex(m[1]) }
}

export const refName = (row, col) => `${colName(col)}${row + 1}`

// ---------------------------------------------------------------------------
// Tokenizer

const OPERATORS = ["<=", ">=", "<>", "=", "<", ">", "+", "-", "*", "/", "^", "&", "%", "(", ")", ",", ";", ":"]
const WORD_RE = /^[A-Za-z_À-ſ$][\w.À-ſ$]*/
const NUMBER_RE = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/

function tokenize(src) {
  const tokens = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) { i++; continue }

    if (ch === '"') {
      let value = ""
      i++
      for (;;) {
        if (i >= src.length) throw new FormulaError("#ERROR!", "Texto sin cerrar")
        if (src[i] === '"') {
          if (src[i + 1] === '"') { value += '"'; i += 2; continue }
          i++
          break
        }
        value += src[i++]
      }
      tokens.push({ type: "string", value })
      continue
    }

    const num = NUMBER_RE.exec(src.slice(i))
    if (num) {
      tokens.push({ type: "number", value: Number(num[0]) })
      i += num[0].length
      continue
    }

    const word = WORD_RE.exec(src.slice(i))
    if (word) {
      tokens.push({ type: "word", value: word[0] })
      i += word[0].length
      continue
    }

    const op = OPERATORS.find((o) => src.startsWith(o, i))
    if (op) {
      tokens.push({ type: "op", value: op })
      i += op.length
      continue
    }

    throw new FormulaError("#ERROR!", `Carácter inesperado: ${ch}`)
  }
  tokens.push({ type: "eof" })
  return tokens
}

// ---------------------------------------------------------------------------
// Parser (Pratt). Precedencias como en Excel: comparación < & < +- < */ < ^ < negación < %

const BINARY = {
  "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1,
  "&": 2,
  "+": 3, "-": 3,
  "*": 4, "/": 4,
  "^": 5,
}
const PREFIX_BP = 6
const POSTFIX_BP = 7

const BOOLEANS = { TRUE: true, FALSE: false, VERDADERO: true, FALSO: false }

export function parseFormula(src) {
  const tokens = tokenize(src)
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const isOp = (v) => peek().type === "op" && peek().value === v
  const expect = (v) => {
    if (!isOp(v)) throw new FormulaError("#ERROR!", `Se esperaba "${v}"`)
    next()
  }

  function expr(minBp) {
    let left = prefix()
    for (;;) {
      const t = peek()
      if (t.type !== "op") break
      if (t.value === "%") {
        if (POSTFIX_BP < minBp) break
        next()
        left = { type: "percent", arg: left }
        continue
      }
      const bp = BINARY[t.value]
      if (!bp || bp < minBp) break
      next()
      // ^ es asociativo por la izquierda en Excel, igual que el resto.
      left = { type: "binary", op: t.value, left, right: expr(bp + 1) }
    }
    return left
  }

  function prefix() {
    const t = next()
    if (t.type === "number") return { type: "value", value: t.value }
    if (t.type === "string") return { type: "value", value: t.value }
    if (t.type === "op" && (t.value === "-" || t.value === "+")) {
      return { type: "unary", op: t.value, arg: expr(PREFIX_BP) }
    }
    if (t.type === "op" && t.value === "(") {
      const inner = expr(0)
      expect(")")
      return inner
    }
    if (t.type === "word") {
      if (isOp("(")) {
        next()
        const args = []
        if (!isOp(")")) {
          for (;;) {
            // Argumento vacío: SI(A1;;2)
            if (isOp(",") || isOp(";") || isOp(")")) args.push({ type: "value", value: null })
            else args.push(expr(0))
            if (isOp(",") || isOp(";")) { next(); continue }
            break
          }
        }
        expect(")")
        return { type: "call", name: t.value, args }
      }
      const ref = parseRef(t.value)
      if (ref) {
        if (isOp(":")) {
          next()
          const end = next()
          const ref2 = end.type === "word" && parseRef(end.value)
          if (!ref2) throw new FormulaError("#ERROR!", "Rango inválido")
          return {
            type: "range",
            top: Math.min(ref.row, ref2.row), left: Math.min(ref.col, ref2.col),
            bottom: Math.max(ref.row, ref2.row), right: Math.max(ref.col, ref2.col),
          }
        }
        return { type: "ref", ...ref }
      }
      const upper = t.value.toUpperCase()
      if (upper in BOOLEANS) return { type: "value", value: BOOLEANS[upper] }
      return { type: "name", name: t.value }
    }
    throw new FormulaError("#ERROR!", "Fórmula incompleta")
  }

  const ast = expr(0)
  if (peek().type !== "eof") throw new FormulaError("#ERROR!", `Sobra "${peek().value}"`)
  return ast
}

// ---------------------------------------------------------------------------
// Coerciones

const EXCEL_EPOCH = Date.UTC(1899, 11, 30)
const DAY_MS = 86400000

export const dateToSerial = (d) =>
  (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EXCEL_EPOCH) / DAY_MS
export const serialToDate = (n) => {
  const d = new Date(EXCEL_EPOCH + Math.floor(n) * DAY_MS)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

export function toNumber(v) {
  if (isError(v)) return v
  if (v === null || v === "") return 0
  if (typeof v === "number") return v
  if (typeof v === "boolean") return v ? 1 : 0
  if (v instanceof Date) return dateToSerial(v)
  if (typeof v === "string" && NUMERIC_RE.test(v.trim())) return Number(v)
  return new FormulaError("#VALUE!", `"${v}" no es un número`)
}

export function toText(v, locale = "es") {
  if (v === null) return ""
  if (typeof v === "boolean") return locale.startsWith("es") ? (v ? "VERDADERO" : "FALSO") : v ? "TRUE" : "FALSE"
  if (typeof v === "number") return formatNumber(v)
  if (v instanceof Date) return formatDate(v, locale)
  return String(v)
}

export function formatNumber(n) {
  if (Number.isInteger(n)) return String(n)
  return String(Number(n.toPrecision(12)))
}

export function formatDate(d, locale = "es") {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return locale.startsWith("es") ? `${dd}-${mm}-${d.getFullYear()}` : `${d.getFullYear()}-${mm}-${dd}`
}

/** Convierte lo que el usuario escribe en una celda (que no es fórmula) en un valor. */
export function parseLiteral(raw) {
  if (raw === null || raw === undefined || raw === "") return null
  if (raw.startsWith("'")) return raw.slice(1)
  const s = raw.trim()
  if (NUMERIC_RE.test(s)) return Number(s)
  if (/^[+-]?(\d+\.?\d*|\.\d+)%$/.test(s)) return Number(s.slice(0, -1)) / 100
  const upper = s.toUpperCase()
  if (upper in BOOLEANS) return BOOLEANS[upper]
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  return raw
}

function compare(a, b) {
  // Vacío se compara como 0 contra números y como "" contra texto.
  if (a === null) a = typeof b === "string" ? "" : 0
  if (b === null) b = typeof a === "string" ? "" : 0
  if (a instanceof Date) a = dateToSerial(a)
  if (b instanceof Date) b = dateToSerial(b)
  const rank = (v) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : 2)
  if (rank(a) !== rank(b)) return rank(a) - rank(b)
  if (typeof a === "string") {
    const x = a.toLowerCase()
    const y = b.toLowerCase()
    return x < y ? -1 : x > y ? 1 : 0
  }
  return a < b ? -1 : a > b ? 1 : 0
}

// ---------------------------------------------------------------------------
// Hoja

export class Sheet {
  /**
   * @param {string[][]} cells  contenido crudo (lo que el usuario escribió) por fila/columna
   * @param {{locale?: string}} [options]
   */
  constructor(cells = [], { locale = "es" } = {}) {
    this.locale = locale
    this.raw = new Map()
    this.asts = new Map()
    cells.forEach((row, r) => row.forEach((value, c) => this.set(r, c, value)))
  }

  key(row, col) {
    return `${row},${col}`
  }

  getRaw(row, col) {
    return this.raw.get(this.key(row, col)) ?? ""
  }

  set(row, col, raw) {
    const k = this.key(row, col)
    raw = raw ?? ""
    if (raw === "") this.raw.delete(k)
    else this.raw.set(k, raw)
    this.asts.delete(k)
    this.cache = null
  }

  /** Tamaño mínimo que contiene todas las celdas con contenido. */
  get size() {
    let rows = 0
    let cols = 0
    for (const k of this.raw.keys()) {
      const [r, c] = k.split(",").map(Number)
      rows = Math.max(rows, r + 1)
      cols = Math.max(cols, c + 1)
    }
    return { rows, cols }
  }

  /** Valor calculado de una celda. */
  get(row, col) {
    if (!this.cache) {
      this.cache = new Map()
      this.visiting = new Set()
    }
    const k = this.key(row, col)
    if (this.cache.has(k)) return this.cache.get(k)
    if (this.visiting.has(k)) return new FormulaError("#REF!", "Referencia circular")

    this.visiting.add(k)
    let value
    try {
      value = this.compute(row, col)
    } finally {
      this.visiting.delete(k)
    }
    // Una celda dentro de un ciclo no se cachea a medio calcular: se recalcula con el error.
    this.cache.set(k, value)
    return value
  }

  compute(row, col) {
    const raw = this.getRaw(row, col)
    if (!raw.startsWith("=") || raw.length === 1) return parseLiteral(raw)
    const k = this.key(row, col)
    let ast = this.asts.get(k)
    if (!ast) {
      try {
        ast = parseFormula(raw.slice(1))
      } catch (err) {
        ast = { type: "error", error: isError(err) ? err : new FormulaError("#ERROR!", String(err)) }
      }
      this.asts.set(k, ast)
    }
    const v = this.evaluate(ast)
    if (v && v.type === "rangeValue") {
      // Sin "spill": una fórmula que devuelve un rango muestra su primera celda si es 1x1.
      return v.values.length === 1 && v.values[0].length === 1 ? v.values[0][0] : new FormulaError("#VALUE!", "El resultado es un rango")
    }
    return v
  }

  /** Valor de la celda en contexto de fórmula: la celda vacía sigue siendo null. */
  evaluate(node) {
    switch (node.type) {
      case "value":
        return node.value
      case "error":
        return node.error
      case "ref":
        return this.get(node.row, node.col)
      case "range": {
        const values = []
        for (let r = node.top; r <= node.bottom; r++) {
          const row = []
          for (let c = node.left; c <= node.right; c++) row.push(this.get(r, c))
          values.push(row)
        }
        return { type: "rangeValue", values }
      }
      case "name":
        return new FormulaError("#NAME?", `Nombre desconocido: ${node.name}`)
      case "unary": {
        const v = toNumber(this.scalar(node.arg))
        if (isError(v)) return v
        return node.op === "-" ? -v : v
      }
      case "percent": {
        const v = toNumber(this.scalar(node.arg))
        return isError(v) ? v : v / 100
      }
      case "binary":
        return this.binary(node.op, this.scalar(node.left), this.scalar(node.right))
      case "call":
        return this.call(node)
      default:
        return new FormulaError("#ERROR!")
    }
  }

  scalar(node) {
    const v = this.evaluate(node)
    if (v && v.type === "rangeValue") {
      if (v.values.length === 1 && v.values[0].length === 1) return v.values[0][0]
      return new FormulaError("#VALUE!", "Se esperaba un valor y no un rango")
    }
    return v
  }

  binary(op, a, b) {
    if (isError(a)) return a
    if (isError(b)) return b

    if (op === "&") return toText(a, this.locale) + toText(b, this.locale)
    if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
      const c = compare(a, b)
      return { "=": c === 0, "<>": c !== 0, "<": c < 0, ">": c > 0, "<=": c <= 0, ">=": c >= 0 }[op]
    }

    const x = toNumber(a)
    const y = toNumber(b)
    if (isError(x)) return x
    if (isError(y)) return y
    let r
    switch (op) {
      case "+": r = x + y; break
      case "-": r = x - y; break
      case "*": r = x * y; break
      case "/":
        if (y === 0) return new FormulaError("#DIV/0!", "División por cero")
        r = x / y
        break
      case "^": r = x ** y; break
    }
    if (!Number.isFinite(r)) return new FormulaError("#NUM!")
    // Fecha ± días sigue siendo fecha; fecha - fecha son días.
    const aDate = a instanceof Date
    const bDate = b instanceof Date
    if ((op === "+" && aDate !== bDate) || (op === "-" && aDate && !bDate)) return serialToDate(r)
    return r
  }

  call(node) {
    const fn = lookupFunction(node.name)
    if (!fn) return new FormulaError("#NAME?", `Función desconocida: ${node.name}`)

    if (isLazy(fn)) {
      // Funciones que deciden qué argumentos evaluar (SI, SI.ERROR…).
      return fn.impl(node.args.map((a) => () => this.scalar(a)), this)
    }

    const args = []
    for (const a of node.args) {
      const v = this.evaluate(a)
      if (v && v.type === "rangeValue") {
        for (const row of v.values) for (const cell of row) if (isError(cell)) return cell
        args.push(v.values)
      } else {
        if (isError(v)) return v
        args.push(v)
      }
    }
    return callFunction(fn, args, this)
  }
}
