# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
require "jekyll-boolean-lms-kit"

class LabTagTest < Minitest::Test
  def render(markup, config = {}, vars = {})
    Dir.mktmpdir do |dir|
      site = Jekyll::Site.new(Jekyll.configuration({ "source" => dir, "quiet" => true }.merge(config)))
      site.includes_load_paths << Jekyll::BooleanLmsKit::INCLUDES_DIR
      template = site.liquid_renderer.file("prueba").parse(markup)
      template.render!(vars.merge("site" => site.site_payload["site"]), registers: { site: site, page: {} })
    end
  end

  def href(html)
    html[/href="([^"]+)"/, 1]
  end

  def test_default_org_and_host
    html = render("{% lab mi-lab %}")
    assert_equal "https://github.com/booleancl/mi-lab", href(html)
    assert_includes html, "Abrir en GitHub"
    assert_includes html, "<svg"
  end

  def test_site_configuration_and_tag_arguments
    config = { "lms_kit" => { "lab" => { "org" => "mi-org" } } }
    assert_equal "https://github.com/mi-org/x", href(render("{% lab x %}", config))
    html = render('{% lab x org=otra host="gitlab.com" %}', config)
    assert_equal "https://gitlab.com/otra/x", href(html)
    assert_includes html, "Abrir en GitLab"
    refute_includes html, "<svg"
  end

  def test_include_with_parameters
    config = { "lms_kit" => { "lab" => { "org" => "mi-org" } } }
    assert_equal "https://github.com/mi-org/y", href(render('{% include lms-kit/lab.html repo="y" %}', config))
    assert_includes render("{% include lms-kit/lab.html %}"), "lab-card--error"
  end

  def test_variable_repo_is_escaped
    html = render("{% lab {{nombre}} %}", {}, { "nombre" => 'a"><script>' })
    refute_includes html, "<script>"
  end

  def test_missing_repo_is_a_syntax_error
    assert_raises(Liquid::SyntaxError, SyntaxError) { render("{% lab %}") }
  end
end
