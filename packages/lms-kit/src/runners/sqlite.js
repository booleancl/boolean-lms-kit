/**
 * Runner de SQL con SQLite (sql.js, WASM empaquetado por Vite junto al sitio).
 *
 * La base inicial sale del contenedor del editor:
 *   - `data-db-url`: archivo .sqlite/.db (metadato `-- db:` del ejemplo), y/o
 *   - `<pre class="lms-setup">`: SQL de esquema y datos (metadato `-- schema:`), que se ejecuta después.
 * La base se mantiene entre ejecuciones; el botón Reset la vuelve a crear.
 */
import initSqlJs from "sql.js"
import wasmUrl from "sql.js/dist/sql-wasm-browser.wasm?url"

const MAX_ROWS = 500

export function sqliteRunner() {
  let SQL
  let dbBytes = null
  let setupSql = ""
  let db

  function createDb() {
    db?.close()
    db = dbBytes ? new SQL.Database(dbBytes) : new SQL.Database()
    if (setupSql.trim()) db.exec(setupSql)
  }

  function tablesSummary() {
    const res = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    const names = res[0]?.values.map((r) => r[0]) ?? []
    return names.length ? `Tablas: ${names.join(", ")}` : "Base de datos vacía"
  }

  return {
    async init(out, root) {
      out.stdout("Cargando SQLite…")
      SQL = await initSqlJs({ locateFile: () => wasmUrl })
      const url = root?.dataset.dbUrl
      if (url) {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`No se pudo descargar ${url} (${res.status})`)
        dbBytes = new Uint8Array(await res.arrayBuffer())
      }
      setupSql = root?.querySelector(".lms-setup")?.textContent ?? ""
      createDb()
      out.clear()
      out.stdout(`SQLite ${db.exec("select sqlite_version()")[0].values[0][0]} listo. ${tablesSummary()}.`)
    },

    run(code, out) {
      let ran = 0
      try {
        for (const stmt of db.iterateStatements(code)) {
          ran++
          const columns = stmt.getColumnNames()
          if (columns.length === 0) {
            stmt.step()
            const changes = db.getRowsModified()
            const sql = stmt.getSQL().trim().split(/\s+/)[0].toUpperCase()
            out.stdout(["INSERT", "UPDATE", "DELETE", "REPLACE"].includes(sql) ? `${sql}: ${changes} fila(s) afectada(s)` : `${sql}: OK`)
            stmt.free()
            continue
          }
          const rows = []
          let total = 0
          while (stmt.step()) {
            if (rows.length < MAX_ROWS) rows.push(stmt.get())
            total++
          }
          stmt.free()
          const note = total > MAX_ROWS ? `${total} filas (se muestran ${MAX_ROWS})` : `${total} fila(s)`
          out.table(columns, rows, note)
        }
        if (ran === 0) out.stdout("No hay consultas para ejecutar.")
      } catch (err) {
        out.stderr(`Error: ${err.message}`)
      }
    },

    reset(out) {
      createDb()
      out.clear()
      out.stdout(`Base de datos reiniciada. ${tablesSummary()}.`)
    },
  }
}
