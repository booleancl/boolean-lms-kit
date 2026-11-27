# frozen_string_literal: true

require "minitest/autorun"
require "jekyll-boolean-lms-kit"

class PaginationTest < Minitest::Test
  Page = Struct.new(:url, :data)

  def page(url, title, **data)
    Page.new(url, { "title" => title }.merge(data.transform_keys(&:to_s)))
  end

  def titles(pages, root: "/docs/")
    Jekyll::BooleanLmsKit::Pagination.sequence(pages, root: root).map { |p| p.data["title"] }
  end

  def test_depth_first_in_menu_order
    pages = [
      page("/docs/b/", "B", nav_order: 2),
      page("/docs/a/2/", "A2", parent: "A", nav_order: 2),
      page("/docs/a/", "A", nav_order: 1),
      page("/docs/a/1/", "A1", parent: "A", nav_order: 1),
      page("/", "Inicio", nav_order: 0),
    ]
    assert_equal %w[Inicio A A1 A2 B], titles(pages)
  end

  def test_numbers_then_text_then_untitled_order
    pages = [
      page("/docs/z/", "Zeta"), page("/docs/c/", "C", nav_order: "b"), page("/docs/m/", "Alfa"),
      page("/docs/d/", "D", nav_order: 10), page("/docs/e/", "E", nav_order: 0.5), page("/docs/f/", "F", nav_order: "a"),
    ]
    assert_equal %w[E D F C Alfa Zeta], titles(pages)
  end

  def test_repeated_titles_use_grand_parent
    pages = [
      page("/docs/1/", "Curso 1", nav_order: 1), page("/docs/2/", "Curso 2", nav_order: 2),
      page("/docs/1/u/", "Unidad", parent: "Curso 1"), page("/docs/2/u/", "Unidad", parent: "Curso 2"),
      page("/docs/2/u/x/", "X", parent: "Unidad", grand_parent: "Curso 2"),
      page("/docs/1/u/y/", "Y", parent: "Unidad", grand_parent: "Curso 1"),
    ]
    assert_equal ["Curso 1", "Unidad", "Y", "Curso 2", "Unidad", "X"], titles(pages)
  end

  def test_four_levels_and_ancestor
    pages = [
      page("/docs/1/", "N1"), page("/docs/2/", "N2", parent: "N1"),
      page("/docs/3/", "N3", parent: "N2", grand_parent: "N1"), page("/docs/4/", "N4", parent: "N3"),
      page("/docs/5/", "N5", parent: "N4", ancestor: "N1"),
    ]
    assert_equal %w[N1 N2 N3 N4 N5], titles(pages)
  end

  def test_excluded_orphan_cyclic_and_outside_root
    pages = [
      page("/docs/a/", "A"), page("/docs/h/", "Oculta", nav_exclude: true), page("/otro/", "Fuera"),
      page("/docs/o/", "Huérfana", parent: "No existe"), page("/docs/s/", "Sola", parent: "Sola"),
      page("/docs/c1/", "C1", parent: "C2"), page("/docs/c2/", "C2", parent: "C1"),
      Page.new("/docs/sin-titulo/", {}), page("/documentos/", "Parecida"),
    ]
    assert_equal %w[A], titles(pages)
  end

  def test_configurable_root
    pages = [page("/curso/a/", "A"), page("/docs/b/", "B")]
    assert_equal %w[A], titles(pages, root: "curso")
    assert_equal %w[A B], titles(pages, root: "/")
  end
end
