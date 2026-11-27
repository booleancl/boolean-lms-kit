# frozen_string_literal: true

require "cgi"

module Jekyll
  module BooleanLmsKit
    # {% python_example ruta.py height=400 %} — inserta un iframe con la página generada del ejemplo.
    # Lo mismo para js_example, sql_example, sheet_example y mindmap.
    class ExampleTag < Liquid::Tag
      ARG_RE = %r!(\w+)=("[^"]*"|'[^']*'|\S+)!

      def initialize(tag_name, markup, tokens)
        super
        @path, *rest = markup.strip.split(%r!\s+!, 2)
        raise SyntaxError, "#{tag_name}: falta la ruta del ejemplo" if @path.to_s.empty?

        @args = rest.join.scan(ARG_RE).to_h { |k, v| [k, v.delete_prefix('"').delete_suffix('"').delete_prefix("'").delete_suffix("'")] }
      end

      def render(context)
        site = context.registers[:site]
        config = BooleanLmsKit.config(site)
        path = render_variable(context, @path)
        src = page_url(config, path)
        render_iframe(context, src, @args)
      end

      private

      def page_url(config, path)
        BooleanLmsKit.join_url(config["url_prefix"], "#{path.delete_suffix(File.extname(path))}.html")
      end

      # Permite `{% python_example {{ page.ejemplo }} %}`.
      def render_variable(context, value)
        value.include?("{{") ? Liquid::Template.parse(value).render(context) : value
      end

      def render_iframe(context, src, args)
        context.stack do
          context["lms_iframe"] = args.merge("src" => src)
          Liquid::Template.parse("{% include lms-kit/iframe.html %}").render!(context)
        end
      end
    end

    class SlidesTag < ExampleTag
      private

      def page_url(config, path)
        BooleanLmsKit.join_url(config["slides_prefix"], "#{path.delete_suffix(File.extname(path))}.html")
      end
    end

    # {% quiz ruta.yml ae=2 height=600 %} — cuestionario autocorregido de `lms_kit.quiz_source`.
    # `ae` filtra por aprendizaje esperado. Sin `height`, el iframe se ajusta al alto del contenido.
    class QuizTag < ExampleTag
      private

      def page_url(config, path)
        url = BooleanLmsKit.join_url(config["quiz_prefix"], "#{path.delete_suffix(File.extname(path))}.html")
        @args["ae"] ? "#{url}?ae=#{CGI.escape(@args['ae'])}" : url
      end

      def render_iframe(context, src, args)
        defaults = { "title" => "Cuestionario" }
        defaults["autoheight"] = "true" unless args["height"]
        super(context, src, defaults.merge(args))
      end
    end

    # {% lms_entrypoint python %} — script del entrypoint de Vite configurado en lms_kit.entrypoints.
    # `{% vite_javascript_tag {{ var }} %}` no sirve en layouts compartidos: jekyll-vite guarda el
    # nombre resuelto en la primera página y lo reutiliza en las siguientes. Aquí se parsea uno nuevo.
    class EntrypointTag < Liquid::Tag
      def render(context)
        key = @markup.strip
        key = Liquid::Template.parse(key).render(context) if key.include?("{{")
        name = BooleanLmsKit.config(context.registers[:site])["entrypoints"][key]
        raise ArgumentError, "lms_entrypoint: no hay entrypoint para '#{key}'" if name.to_s.empty?

        Liquid::Template.parse("{% vite_javascript_tag #{name} %}").render!(context)
      end
    end

    class WebExampleTag < Liquid::Tag
      def render(_context)
        Jekyll.logger.warn "LMS Kit:", "{% web_example #{@markup.strip} %} aún no está soportado."
        "<!-- web_example: pendiente -->"
      end
    end
  end
end

Liquid::Template.register_tag("python_example", Jekyll::BooleanLmsKit::ExampleTag)
Liquid::Template.register_tag("js_example", Jekyll::BooleanLmsKit::ExampleTag)
Liquid::Template.register_tag("sql_example", Jekyll::BooleanLmsKit::ExampleTag)
Liquid::Template.register_tag("sheet_example", Jekyll::BooleanLmsKit::ExampleTag)
Liquid::Template.register_tag("slides", Jekyll::BooleanLmsKit::SlidesTag)
Liquid::Template.register_tag("quiz", Jekyll::BooleanLmsKit::QuizTag)
Liquid::Template.register_tag("lms_entrypoint", Jekyll::BooleanLmsKit::EntrypointTag)
Liquid::Template.register_tag("web_example", Jekyll::BooleanLmsKit::WebExampleTag)
Liquid::Template.register_tag("mindmap", Jekyll::BooleanLmsKit::ExampleTag)
