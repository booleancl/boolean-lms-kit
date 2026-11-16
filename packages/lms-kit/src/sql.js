import { sql, SQLite } from "@codemirror/lang-sql"
import { createEditor } from "./editor/create-editor.js"
import { sqliteRunner } from "./runners/sqlite.js"
import "./editor/editor.css"

createEditor({ language: sql({ dialect: SQLite, upperCaseKeywords: true }), runner: sqliteRunner() })
