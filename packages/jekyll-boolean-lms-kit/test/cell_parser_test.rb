# frozen_string_literal: true

require "minitest/autorun"
require "jekyll-boolean-lms-kit"

class CellParserTest < Minitest::Test
  P = Jekyll::BooleanLmsKit::CellParser

  def test_metadata_and_titled_cells
    src = <<~PY
      # title: Variables
      # author: Boolean

      # %% Asignación
      x = 1
      print(x)

      # %%
      y = 2
    PY
    r = P.parse(src)
    assert_equal({ "title" => "Variables", "author" => "Boolean" }, r[:meta])
    assert_equal 2, r[:cells].size
    assert_equal "Asignación", r[:cells][0].title
    assert_equal "x = 1\nprint(x)\n", r[:cells][0].code
    assert_nil r[:cells][1].title
    assert_equal "y = 2\n", r[:cells][1].code
  end

  def test_no_markers_is_single_cell
    r = P.parse("# title: Hola\nprint('hola')\n")
    assert_equal "Hola", r[:meta]["title"]
    assert_equal 1, r[:cells].size
    assert_equal "print('hola')\n", r[:cells][0].code
  end

  def test_plain_comment_is_not_metadata
    r = P.parse("# esto es un comentario normal\nx = 1\n")
    assert_empty r[:meta]
    assert_equal "# esto es un comentario normal\nx = 1\n", r[:cells][0].code
  end

  def test_js_comment_style
    r = P.parse("// title: JS\n// %% Uno\nconsole.log(1)\n// %% Dos\nconsole.log(2)\n", comment: "//")
    assert_equal "JS", r[:meta]["title"]
    assert_equal %w[Uno Dos], r[:cells].map(&:title)
  end

  def test_code_before_first_marker_becomes_cell
    r = P.parse("import math\n# %% A\nprint(math.pi)\n")
    assert_equal [nil, "A"], r[:cells].map(&:title)
  end
end

class FrontMatterTest < Minitest::Test
  def test_splits_front_matter_and_body
    src = "---\ntitle: Mapa\nmarkmap:\n  wrapWidth: 240\n  theme: minimal\n---\n# Raíz\n- hijo\n"
    front, body = Jekyll::BooleanLmsKit.split_front_matter(src)
    assert_equal "Mapa", front["title"]
    assert_equal({ "wrapWidth" => 240, "theme" => "minimal" }, front["markmap"])
    assert_equal "# Raíz\n- hijo\n", body
  end

  def test_without_front_matter
    front, body = Jekyll::BooleanLmsKit.split_front_matter("# Raíz\n")
    assert_equal({}, front)
    assert_equal "# Raíz\n", body
  end
end
