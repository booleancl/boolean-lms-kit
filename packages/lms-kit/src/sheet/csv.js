/**
 * CSV mínimo (RFC 4180): comillas dobles para campos con separador, comillas o saltos de línea.
 * Una fórmula con comas dentro debe ir entre comillas: "=SUMA(A1,A2)". Con `;` como separador
 * de argumentos no hace falta: =SUMA(A1;A2).
 */
export function parseCSV(text, delimiter = ",") {
  const rows = []
  let row = []
  let field = ""
  let quoted = false
  text = text.replace(/\r\n?/g, "\n")

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else quoted = false
      } else field += ch
    } else if (ch === '"' && field === "") quoted = true
    else if (ch === delimiter) { row.push(field); field = "" }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = "" }
    else field += ch
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row) }
  return rows
}

export function toCSV(rows, delimiter = ",") {
  const esc = (v) => (/["\n\r]/.test(v) || v.includes(delimiter) ? `"${v.replace(/"/g, '""')}"` : v)
  return rows.map((r) => r.map(esc).join(delimiter)).join("\n") + "\n"
}
