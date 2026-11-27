// Cuestionario autocorregido (layout `lms-quiz` de la gema). Al enviar, marca cada pregunta, muestra la
// retroalimentación de la alternativa elegida y un resumen con el porcentaje de logro.
//
// Mensajes hacia la página que lo contiene (postMessage, mismo origen):
//   { type: "lms-kit:resize", height }
//   { type: "lms-kit:quiz-result", quiz, ae, correct, total, score, passed }
import { matchesAE, score } from "./score.js"

function postToHost(message) {
  if (window.parent !== window) window.parent.postMessage(message, window.location.origin)
}

/** Deja visibles solo las preguntas del `ae` pedido y las renumera. Devuelve las visibles. */
function filterItems(form, ae) {
  const items = [...form.querySelectorAll(".lms-quiz-item")]
  const visible = items.filter((item) => matchesAE(item.dataset.ae, ae))
  items.filter((item) => !visible.includes(item)).forEach((item) => item.remove())
  visible.forEach((item, i) => {
    item.querySelector(".lms-quiz-number").textContent = `${i + 1}.`
    if (ae) item.querySelector(".lms-quiz-ae")?.remove()
  })
  return visible
}

function markItem(item) {
  const feedback = item.querySelector(".lms-quiz-feedback")
  const chosen = item.querySelector("input:checked")
  const ok = Boolean(chosen?.hasAttribute("data-correct"))

  item.classList.toggle("lms-quiz-item--correct", ok)
  item.classList.toggle("lms-quiz-item--incorrect", !ok)
  feedback.hidden = false
  feedback.textContent = chosen ? `${ok ? "✅" : "❌"} ${chosen.dataset.feedback}` : "Sin responder."
  return ok
}

function clear(form) {
  form.querySelectorAll(".lms-quiz-item").forEach((item) => {
    item.classList.remove("lms-quiz-item--correct", "lms-quiz-item--incorrect")
    item.querySelector(".lms-quiz-feedback").hidden = true
  })
  form.querySelector(".lms-quiz-result").hidden = true
}

// Se mide el contenedor y no el documento: este nunca es más bajo que el iframe y no permitiría encoger.
function reportHeight(root) {
  const send = () => postToHost({ type: "lms-kit:resize", height: root.getBoundingClientRect().height })
  new ResizeObserver(send).observe(root)
  // El script de la página contenedora puede registrarse después de que cargue el iframe.
  window.addEventListener("load", send)
}

export function createQuiz(root = document.getElementById("lms-quiz")) {
  const form = root.querySelector(".lms-quiz-form")
  const result = form.querySelector(".lms-quiz-result")
  const ae = new URLSearchParams(window.location.search).get("ae")
  const items = filterItems(form, ae)
  const minScore = Number(root.dataset.minLogro)

  if (!items.length) {
    form.querySelector(".lms-toolbar").hidden = true
    result.hidden = false
    result.textContent = `No hay preguntas para el aprendizaje esperado ${ae}.`
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const summary = score(items.map(markItem), minScore)
    const message = summary.passed ? root.dataset.mensajeAprobado : root.dataset.mensajeRepaso

    result.hidden = false
    result.classList.toggle("lms-quiz-result--ok", summary.passed)
    result.textContent =
      `Obtuviste ${summary.correct} de ${summary.total} (${Math.round(summary.score * 100)}%). ${message}`
    postToHost({ type: "lms-kit:quiz-result", quiz: root.dataset.quiz, ae, ...summary })
  })
  form.addEventListener("reset", () => clear(form))

  reportHeight(root)
}
