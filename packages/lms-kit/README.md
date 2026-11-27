# @booleancl/lms-kit

Frontend de [boolean-lms-kit](https://github.com/booleancl/boolean-lms-kit): editor CodeMirror 6, runners
(Pyodide, JavaScript, SQLite), planilla de cálculo, cuestionarios, reveal.js y el plugin de Vite `@booleancl/lms-kit/vite`.

Se usa junto a la gema `jekyll-boolean-lms-kit`.

```sh
npm install @booleancl/lms-kit
```

```ts
// vite.config.ts
import lmsKit from '@booleancl/lms-kit/vite'
export default defineConfig({ plugins: [RubyPlugin(), lmsKit()] })
```

Configuración de la gema, Liquid tags y demás en el
[README del repositorio](https://github.com/booleancl/boolean-lms-kit#readme).

MIT © Academia Boolean SpA
