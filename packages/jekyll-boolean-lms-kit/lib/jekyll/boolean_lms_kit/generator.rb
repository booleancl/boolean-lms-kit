# frozen_string_literal: true

module Jekyll
  module BooleanLmsKit
    # Crea una página por cada ejemplo en `lms_kit.source` y por cada presentación en `lms_kit.slides_source`.
    class Generator < Jekyll::Generator
      safe true
      priority :high

      LANGS = {
        ".py" => { "lang" => "python", "comment" => "#" },
        ".js" => { "lang" => "javascript", "comment" => "//" },
      }.freeze

      def generate(site)
        @site = site
        @config = BooleanLmsKit.config(site)
        generate_examples
        generate_slides
      end

      private

      def generate_examples
        root = @site.in_source_dir(@config["source"])
        return unless File.directory?(root)

        Dir.glob("**/*", base: root).sort.each do |rel|
          full = File.join(root, rel)
          if File.directory?(full)
            if File.exist?(File.join(full, "index.html"))
              Jekyll.logger.warn "LMS Kit:", "#{rel}/ es un ejemplo web; se soportará en v0.2, se omite."
            end
            next
          end
          next if web_example_file?(root, rel)

          lang = LANGS[File.extname(rel)]
          next unless lang

          @site.pages << example_page(full, rel, lang)
        end
      end

      def web_example_file?(root, rel)
        dir = File.dirname(rel)
        dir != "." && File.exist?(File.join(root, dir, "index.html"))
      end

      def example_page(full, rel, lang)
        parsed = CellParser.parse(File.read(full, encoding: "UTF-8"), comment: lang["comment"])
        base = rel.delete_suffix(File.extname(rel))
        page = new_page(base)
        page.data.merge!(
          "layout"           => "lms-editor",
          "title"            => parsed[:meta]["title"] || File.basename(base),
          "lang"             => lang["lang"],
          "cells"            => parsed[:cells].map(&:to_liquid),
          "meta"             => parsed[:meta],
          "nav_exclude"      => true,
          "search_exclude"   => true,
          "permalink"        => BooleanLmsKit.join_url(@config["url_prefix"], "#{base}.html"),
          "lms_kit"          => @config,
          "lms_source_path"  => rel
        )
        page.content = ""
        page
      end

      def generate_slides
        root = @site.in_source_dir(@config["slides_source"])
        return unless File.directory?(root)

        Dir.glob("**/*.md", base: root).sort.each do |rel|
          base = rel.delete_suffix(".md")
          content = File.read(File.join(root, rel), encoding: "UTF-8")
          front = {}
          if content =~ Jekyll::Document::YAML_FRONT_MATTER_REGEXP
            content = Regexp.last_match.post_match
            front = SafeYAML.load(Regexp.last_match(1)) || {}
          end
          page = new_page(base)
          page.data.merge!(
            "layout"         => "lms-reveal",
            "title"          => File.basename(base),
            "nav_exclude"    => true,
            "search_exclude" => true,
            "lms_kit"        => @config
          ).merge!(front)
          page.data["permalink"] = BooleanLmsKit.join_url(@config["slides_prefix"], "#{base}.html")
          page.content = content
          @site.pages << page
        end
      end

      # `.html` para que Jekyll no pase el contenido por el conversor de Markdown.
      def new_page(base)
        Jekyll::PageWithoutAFile.new(@site, @site.source, File.dirname(base), "#{File.basename(base)}.html")
      end
    end
  end
end
