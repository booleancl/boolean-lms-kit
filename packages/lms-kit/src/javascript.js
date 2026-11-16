import { javascript } from "@codemirror/lang-javascript"
import { createEditor } from "./editor/create-editor.js"
import { browserJsRunner } from "./runners/browser-js.js"
import "./editor/editor.css"

createEditor({ language: javascript(), runner: browserJsRunner() })
