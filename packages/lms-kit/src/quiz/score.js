/** Filtra por aprendizaje esperado. Sin `ae`, todas las preguntas aplican. */
export function matchesAE(itemAE, ae) {
  return !ae || String(itemAE) === String(ae)
}

/** `results` es un arreglo de booleanos (true = respuesta correcta). */
export function score(results, minScore) {
  const total = results.length
  const correct = results.filter(Boolean).length
  const ratio = total ? correct / total : 0
  return { correct, total, score: ratio, passed: total > 0 && ratio >= minScore }
}
