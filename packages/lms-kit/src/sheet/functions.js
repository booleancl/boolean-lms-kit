/**
 * Funciones de la planilla. Las implementa @formulajs/formulajs (MIT); aquí se agregan los nombres en
 * español (como Google Sheets / Excel en es-CL), las funciones "perezosas" (SI, SI.ERROR…) y la
 * conversión de resultados/errores al formato del motor.
 */
import * as formulajs from "@formulajs/formulajs"
import { FormulaError, isError, toNumber } from "./engine.js"

/** Nombre en español (sin tildes, en mayúsculas) -> nombre en inglés. */
export const SPANISH = {
  SUMA: "SUM", PROMEDIO: "AVERAGE", CONTAR: "COUNT", CONTARA: "COUNTA",
  "CONTAR.BLANCO": "COUNTBLANK", "CONTAR.SI": "COUNTIF", "CONTAR.SI.CONJUNTO": "COUNTIFS",
  "SUMAR.SI": "SUMIF", "SUMAR.SI.CONJUNTO": "SUMIFS",
  "PROMEDIO.SI": "AVERAGEIF", "PROMEDIO.SI.CONJUNTO": "AVERAGEIFS",
  SI: "IF", "SI.CONJUNTO": "IFS", "SI.ERROR": "IFERROR", "SI.ND": "IFNA",
  Y: "AND", O: "OR", NO: "NOT", XO: "XOR",
  REDONDEAR: "ROUND", "REDONDEAR.MAS": "ROUNDUP", "REDONDEAR.MENOS": "ROUNDDOWN",
  ENTERO: "INT", RESIDUO: "MOD", POTENCIA: "POWER", RAIZ: "SQRT", PRODUCTO: "PRODUCT",
  SIGNO: "SIGN", TRUNCAR: "TRUNC", "MULTIPLO.SUPERIOR": "CEILING", "MULTIPLO.INFERIOR": "FLOOR",
  SUMAPRODUCTO: "SUMPRODUCT", ALEATORIO: "RAND", "ALEATORIO.ENTRE": "RANDBETWEEN",
  MEDIANA: "MEDIAN", MODA: "MODE", "MODA.UNO": "MODE",
  DESVEST: "STDEV", "DESVEST.M": "STDEV", DESVESTP: "STDEVP", "DESVEST.P": "STDEVP",
  "VAR.S": "VAR", VARP: "VARP", "VAR.P": "VARP",
  "K.ESIMO.MAYOR": "LARGE", "K.ESIMO.MENOR": "SMALL", JERARQUIA: "RANK", "JERARQUIA.EQV": "RANK",
  BUSCARV: "VLOOKUP", BUSCARH: "HLOOKUP", BUSCARX: "XLOOKUP", INDICE: "INDEX", COINCIDIR: "MATCH",
  ELEGIR: "CHOOSE",
  CONCATENAR: "CONCATENATE", UNIRCADENAS: "TEXTJOIN", IZQUIERDA: "LEFT", DERECHA: "RIGHT",
  EXTRAE: "MID", LARGO: "LEN", MAYUSC: "UPPER", MINUSC: "LOWER", NOMPROPIO: "PROPER",
  ESPACIOS: "TRIM", SUSTITUIR: "SUBSTITUTE", REEMPLAZAR: "REPLACE", ENCONTRAR: "FIND",
  HALLAR: "SEARCH", VALOR: "VALUE", REPETIR: "REPT", IGUAL: "EXACT", TEXTO: "TEXT",
  HOY: "TODAY", AHORA: "NOW", FECHA: "DATE", ANO: "YEAR", MES: "MONTH", DIA: "DAY",
  DIASEM: "WEEKDAY", DIAS: "DAYS", "FECHA.MES": "EDATE", SIFECHA: "DATEDIF",
  ESBLANCO: "ISBLANK", ESNUMERO: "ISNUMBER", ESTEXTO: "ISTEXT", ESERROR: "ISERROR", ESNOD: "ISNA",
  NOD: "NA",
}

/** En formulajs algunas funciones son espacios de nombres (MODE.SNGL…). */
const FORMULAJS_NAMES = { MODE: "MODESNGL", STDEV: "STDEVS", VAR: "VARS", RANK: "RANKEQ" }

const truthy = (v) => {
  if (isError(v)) return v
  if (typeof v === "boolean") return v
  if (typeof v === "string") {
    const u = v.toUpperCase()
    if (u === "TRUE" || u === "VERDADERO") return true
    if (u === "FALSE" || u === "FALSO") return false
    return new FormulaError("#VALUE!", `"${v}" no es VERDADERO ni FALSO`)
  }
  const n = toNumber(v)
  return isError(n) ? n : n !== 0
}

const LAZY = {
  IF([cond, ifTrue, ifFalse]) {
    if (!cond) return new FormulaError("#N/A", "SI necesita al menos 2 argumentos")
    const c = truthy(cond())
    if (isError(c)) return c
    if (c) return ifTrue ? ifTrue() : true
    return ifFalse ? ifFalse() : false
  },
  IFS(args) {
    for (let i = 0; i + 1 < args.length; i += 2) {
      const c = truthy(args[i]())
      if (isError(c)) return c
      if (c) return args[i + 1]()
    }
    return new FormulaError("#N/A", "Ninguna condición se cumple")
  },
  IFERROR([value, fallback]) {
    const v = value()
    return isError(v) ? (fallback ? fallback() : "") : v
  },
  IFNA([value, fallback]) {
    const v = value()
    return isError(v) && v.code === "#N/A" ? (fallback ? fallback() : "") : v
  },
  ISERROR: ([value]) => isError(value()),
  ISERR: ([value]) => {
    const v = value()
    return isError(v) && v.code !== "#N/A"
  },
  ISNA: ([value]) => {
    const v = value()
    return isError(v) && v.code === "#N/A"
  },
  ISBLANK: ([value]) => value() === null,
}

const norm = (v) => (typeof v === "string" ? v.toLowerCase() : v instanceof Date ? v.getTime() : v)

const CUSTOM = {
  XLOOKUP(lookup, lookupArray, returnArray, ifNotFound) {
    if (!Array.isArray(lookupArray) || !Array.isArray(returnArray)) {
      return new FormulaError("#VALUE!", "BUSCARX necesita rangos")
    }
    const vertical = lookupArray.length > 1 || lookupArray[0].length === 1
    const list = vertical ? lookupArray.map((r) => r[0]) : lookupArray[0]
    const i = list.findIndex((v) => norm(v) === norm(lookup))
    if (i < 0) return ifNotFound !== undefined ? ifNotFound : new FormulaError("#N/A", "No encontrado")
    const value = vertical ? returnArray[i]?.[0] : returnArray[0]?.[i]
    return value === undefined ? new FormulaError("#REF!") : value
  },
}

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")

/**
 * @returns {{name: string, impl: Function, lazy?: boolean} | null}
 */
export function lookupFunction(rawName) {
  const upper = stripAccents(rawName).toUpperCase()
  const name = SPANISH[upper] ?? upper
  if (LAZY[name]) return { name, impl: LAZY[name], lazy: true }
  if (CUSTOM[name]) return { name, impl: CUSTOM[name] }
  const impl = formulajs[FORMULAJS_NAMES[name] ?? name] ?? formulajs[name.replace(/\./g, "")]
  return typeof impl === "function" ? { name, impl } : null
}

export const isLazy = (fn) => fn.lazy === true

/**
 * En Excel/Sheets, las funciones numéricas ignoran el texto dentro de rangos (=SUMA(A1:A3) con "hola"
 * en A2 suma el resto). formulajs en cambio intenta convertirlo (parseFloat("1/0") = 1), así que se quita.
 */
const IGNORE_TEXT_IN_RANGES = new Set([
  "SUM", "AVERAGE", "MIN", "MAX", "PRODUCT", "MEDIAN", "MODE", "STDEV", "STDEVP", "VAR", "VARP",
  "LARGE", "SMALL", "COUNT", "SUMPRODUCT", "RANK",
])

const withoutText = (arg) =>
  Array.isArray(arg) ? arg.map((row) => row.map((v) => (typeof v === "string" ? null : v))) : arg

export function callFunction(fn, args) {
  if (IGNORE_TEXT_IN_RANGES.has(fn.name)) args = args.map(withoutText)
  let result
  try {
    result = fn.impl(...args)
  } catch (err) {
    return new FormulaError("#VALUE!", err?.message ?? String(err))
  }
  return fromFormulajs(result)
}

function fromFormulajs(v) {
  if (isError(v)) return v
  if (v instanceof Error) {
    const code = /^#[A-Z0-9/!?]+/.exec(v.message)?.[0]
    return new FormulaError(code ?? "#VALUE!", code ? "" : v.message)
  }
  if (v === undefined) return new FormulaError("#N/A")
  if (typeof v === "number" && !Number.isFinite(v)) return new FormulaError("#NUM!")
  if (Array.isArray(v)) {
    const flat = v.flat(Infinity)
    return flat.length === 1 ? fromFormulajs(flat[0]) : new FormulaError("#VALUE!", "El resultado es un rango")
  }
  return v
}
