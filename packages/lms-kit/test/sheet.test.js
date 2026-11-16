import { test } from "node:test"
import assert from "node:assert/strict"
import { Sheet, parseRef, colName, isError } from "../src/sheet/engine.js"
import { parseCSV, toCSV } from "../src/sheet/csv.js"

const calc = (cells, ref = "A1") => {
  const s = new Sheet(cells)
  const { row, col } = parseRef(ref)
  const v = s.get(row, col)
  return isError(v) ? v.code : v
}
const one = (formula, extra = []) => calc([[formula], ...extra])

test("referencias A1", () => {
  assert.deepEqual(parseRef("B3"), { row: 2, col: 1 })
  assert.deepEqual(parseRef("$AA$10"), { row: 9, col: 26 })
  assert.equal(colName(0), "A")
  assert.equal(colName(27), "AB")
})

test("aritmética y precedencia", () => {
  assert.equal(one("=1+2*3"), 7)
  assert.equal(one("=(1+2)*3"), 9)
  assert.equal(one("=2^3^2"), 64) // izquierda a derecha, como Excel
  assert.equal(one("=-2^2"), 4) // la negación va antes que ^, como Excel
  assert.equal(one("=50%*10"), 5)
  assert.equal(one("=1/0"), "#DIV/0!")
  assert.equal(one('="a"&1&VERDADERO'), "a1VERDADERO")
  assert.equal(one("=0.1+0.2"), 0.30000000000000004) // el valor exacto; el formato redondea al mostrar
})

test("comparaciones", () => {
  assert.equal(one("=1<2"), true)
  assert.equal(one('="Hola"="hola"'), true)
  assert.equal(one("=B1=0", []), true) // vacío = 0
})

test("referencias, rangos y literales", () => {
  const cells = [["10", "20", "=A1+B1"], ["3.5", "50%", "=SUMA(A1:B2)"], ["texto", "", "=A3*2"]]
  assert.equal(calc(cells, "C1"), 30)
  assert.equal(calc(cells, "C2"), 34)
  assert.equal(calc(cells, "C3"), "#VALUE!")
  assert.equal(calc(cells, "B2"), 0.5)
})

test("funciones en español e inglés, con ; o ,", () => {
  const data = [["1"], ["5"], ["7"]].map((r) => ["", ...r])
  const at = (f) => calc([[f], ...data.slice(1)].map((r, i) => (i === 0 ? [f, "1"] : r)))
  assert.equal(at("=SUMA(B1:B3)"), 13)
  assert.equal(at("=SUM(B1:B3)"), 13)
  assert.equal(at("=PROMEDIO(B1:B3)"), 13 / 3)
  assert.equal(at('=CONTAR.SI(B1:B3;">4")'), 2)
  assert.equal(at('=COUNTIF(B1:B3,">4")'), 2)
  assert.equal(at("=MAX(B1:B3)"), 7)
  assert.equal(at("=REDONDEAR(PROMEDIO(B1:B3);2)"), 4.33)
  assert.equal(at('=SI(B2>4;"alto";"bajo")'), "alto")
  assert.equal(at("=sumar.si(B1:B3;\">1\")"), 12)
  assert.equal(at("=FOO(1)"), "#NAME?")
})

test("SI es perezoso y SI.ERROR atrapa errores", () => {
  assert.equal(one('=SI(VERDADERO;1;1/0)'), 1)
  assert.equal(one('=SI.ERROR(1/0;"div")'), "div")
  assert.equal(one('=IFERROR(B1;"x")', []), null)
  assert.equal(one("=ESERROR(1/0)"), true)
})

test("texto", () => {
  assert.equal(one('=MAYUSC("hola")'), "HOLA")
  assert.equal(one('=IZQUIERDA("Boolean";4)'), "Bool")
  assert.equal(one('=LARGO("año")'), 3)
  assert.equal(one('=CONCATENAR("a";"b";"c")'), "abc")
})

test("búsquedas", () => {
  const t = [["", "1", "uno"], ["", "2", "dos"], ["", "3", "tres"]]
  const at = (f) => calc(t.map((r, i) => (i === 0 ? [f, ...r.slice(1)] : r)))
  assert.equal(at("=BUSCARV(2;B1:C3;2;FALSO)"), "dos")
  assert.equal(at('=BUSCARX(3;B1:B3;C1:C3)'), "tres")
  assert.equal(at('=BUSCARX(9;B1:B3;C1:C3;"no")'), "no")
  assert.equal(at("=INDICE(C1:C3;COINCIDIR(2;B1:B3;0))"), "dos")
  assert.equal(at("=BUSCARV(9;B1:C3;2;FALSO)"), "#N/A")
})

test("fechas", () => {
  const cells = [["2024-03-15", "=AÑO(A1)", "=A1+10", "=C1-A1", "=DIA(FECHA(2024;2;29))"]]
  assert.equal(calc(cells, "B1"), 2024)
  assert.ok(calc(cells, "C1") instanceof Date)
  assert.equal(calc(cells, "C1").getDate(), 25)
  assert.equal(calc(cells, "D1"), 10)
  assert.equal(calc(cells, "E1"), 29)
})

test("errores de sintaxis, ciclos y propagación", () => {
  assert.equal(one("=1+"), "#ERROR!")
  assert.equal(one('="abc'), "#ERROR!")
  assert.equal(calc([["=B1", "=A1"]]), "#REF!")
  assert.equal(calc([["=A1"]]), "#REF!")
  assert.equal(calc([["=1/0", "=A1+1", "=SUMA(A1:B1)"]], "C1"), "#DIV/0!")
  assert.equal(one("=SUMA(A2:A3)", [["1/0"], ["2"]]), 2) // "1/0" sin "=" es texto y SUMA lo ignora
})

test("recalcula al editar", () => {
  const s = new Sheet([["1", "=A1*2"]])
  assert.equal(s.get(0, 1), 2)
  s.set(0, 0, "5")
  assert.equal(s.get(0, 1), 10)
})

test("CSV", () => {
  const rows = parseCSV('a,"b,c","=SUMA(A1,A2)"\n1,"dice ""hola""",\n')
  assert.deepEqual(rows, [["a", "b,c", "=SUMA(A1,A2)"], ["1", 'dice "hola"', ""]])
  assert.equal(toCSV(rows), 'a,"b,c","=SUMA(A1,A2)"\n1,"dice ""hola""",\n')
  assert.deepEqual(parseCSV('x;"=SUMA(A1;A2)"', ";"), [["x", "=SUMA(A1;A2)"]])
})
