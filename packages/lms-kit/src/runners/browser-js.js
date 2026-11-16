/**
 * Runner de JavaScript en el mismo navegador. El código recibe un `console` propio
 * (como parámetro) que escribe en la consola del editor y también en la del navegador,
 * así no se reemplaza el `console` global. Soporta `await` de nivel superior.
 */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

function format(value) {
  if (typeof value === "string") return value
  if (value instanceof Error) return `${value.name}: ${value.message}`
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

export function browserJsRunner() {
  return {
    init(out) {
      out.stdout("JavaScript listo.")
    },

    async run(code, out) {
      const native = globalThis.console
      const line = (args) => args.map(format).join(" ")
      const sandboxConsole = {
        ...native,
        log: (...a) => { out.stdout(line(a)); native.log(...a) },
        info: (...a) => { out.stdout(line(a)); native.info(...a) },
        warn: (...a) => { out.stderr(line(a)); native.warn(...a) },
        error: (...a) => { out.stderr(line(a)); native.error(...a) },
      }
      try {
        await new AsyncFunction("console", code)(sandboxConsole)
      } catch (err) {
        out.stderr(format(err))
      }
    },
  }
}
