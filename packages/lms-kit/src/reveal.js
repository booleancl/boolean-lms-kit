import Reveal from "reveal.js"
import Markdown from "reveal.js/plugin/markdown/markdown.esm.js"
import RevealHighlight from "reveal.js/plugin/highlight/highlight.esm.js"
import RevealNotes from "reveal.js/plugin/notes/notes.esm.js"
import RevealZoom from "reveal.js/plugin/zoom/zoom.esm.js"
import RevealSearch from "reveal.js/plugin/search/search.esm.js"
import RevealMath from "reveal.js/plugin/math/math.esm.js"

import "reveal.js/dist/reset.css"
import "reveal.js/dist/reveal.css"
import "reveal.js/dist/theme/black.css"
import "reveal.js/plugin/highlight/monokai.css"
import "./reveal.css"

export const deck = new Reveal({
  plugins: [Markdown, RevealHighlight, RevealNotes, RevealZoom, RevealSearch, RevealMath.KaTeX],
})

deck.initialize({
  controls: true,
  controlsTutorial: false,
  controlsLayout: "bottom-right",
  controlsBackArrows: "faded",
  progress: true,
  slideNumber: false,
  hash: true,
  keyboard: true,
  overview: true,
  pdfSeparateFragments: false,
})
