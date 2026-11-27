# frozen_string_literal: true

require "minitest/autorun"
require "jekyll-boolean-lms-kit"

class QuizParserTest < Minitest::Test
  P = Jekyll::BooleanLmsKit::QuizParser

  VALID = <<~YAML
    - ae: 1
      pregunta: ¿Uno?
      opciones:
        - texto: Sí
          feedback: Bien
          correcta: true
        - texto: No
  YAML

  def test_list_format
    meta, items = P.parse(VALID)
    assert_empty meta
    assert_equal 1, items.first["ae"]
    assert_equal [true, false], items.first["opciones"].map { |o| o["correcta"] }
    assert_equal "", items.first["opciones"].last["feedback"]
  end

  def test_map_format_keeps_options
    meta, items = P.parse("title: Control\nmin_logro: 0.8\npreguntas:\n#{VALID.gsub(/^/, '  ')}")
    assert_equal({ "title" => "Control", "min_logro" => 0.8 }, meta)
    assert_equal 1, items.size
  end

  def test_rejects_invalid_quizzes
    [
      "",
      "title: Sin preguntas\n",
      VALID.sub("pregunta: ¿Uno?", "pregunta:"),
      VALID.sub("      correcta: true\n", ""),
      "#{VALID}      correcta: true\n",
      VALID.sub("    - texto: No\n", ""),
      "- pregunta: [\n",
    ].each { |source| assert_raises(P::Error, source.inspect) { P.parse(source) } }
  end
end
