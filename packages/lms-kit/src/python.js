import { python } from "@codemirror/lang-python"
import { createEditor } from "./editor/create-editor.js"
import { pyodideRunner } from "./runners/pyodide.js"
import "./editor/editor.css"

createEditor({ language: python(), runner: pyodideRunner() })
