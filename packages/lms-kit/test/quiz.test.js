import { test } from "node:test"
import assert from "node:assert/strict"
import { matchesAE, score } from "../src/quiz/score.js"

test("puntaje y umbral de logro", () => {
  assert.deepEqual(score([true, true, true, false, false], 0.6), { correct: 3, total: 5, score: 0.6, passed: true })
  assert.equal(score([true, false], 0.6).passed, false)
  assert.equal(score([], 0).passed, false)
})

test("filtro por aprendizaje esperado", () => {
  assert.ok(matchesAE("1", null))
  assert.ok(matchesAE("2", 2))
  assert.ok(!matchesAE("1", "2"))
  assert.ok(!matchesAE("", "1"))
})
