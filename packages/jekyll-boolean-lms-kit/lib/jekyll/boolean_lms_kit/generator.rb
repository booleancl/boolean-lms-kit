# frozen_string_literal: true

module Jekyll
  module BooleanLmsKit
    # Crea una página por cada ejemplo en `lms_kit.source` y por cada presentación en `lms_kit.slides_source`.
    #
    # Ejemplos soportados:
    #   .py / .js / .sql -> layout lms-editor (celdas `# %%`, `// %%`, `-- %%`)
    #   .csv             -> layout lms-sheet (planilla; las celdas que empiezan con "=" son fórmulas)
    #
    # Los archivos y carpetas que empiezan con "_" no generan página (como en Jekyll): sirven para
    # esquemas SQL o bases de datos que otros ejemplos referencian con `-- schema:` / `-- db:`.
    class Generator < Jekyll::Generator
      safe true
      priority :high

      LANGS = {
        ".py"  => { "lang" => "python", "comment" => "#" },
        ".js"  => { "lang" => "javascript", "comment" => "//" },
        ".sql" => { "lang" => "sql", "comment" => "--" },
      }.freeze

      def generate(site)
        @site = site
        @config = BooleanLmsKit.config(site)
        @assets = {}
        generate_examples
        generate_slides
      end

      private

      def source_root
        @source_root ||= @site.in_source_dir(@config["source"])
      end

      def generate_examples
        return unless File.directory?(source_root)

        Dir.glob("**/*", base: source_root).sort.each do |rel|
          next if rel.split("/").any? { |part| part.start_with?("_") }

          full = File.join(source_root, rel)
          if File.directory?(full)
            if File.exist?(File.join(full, "index.html"))
              Jekyll.logger.warn "LMS Kit:", "#{rel}/ es un ejemplo web; se soportará en v0.2, se omite."
            end
            next
          end
          next if web_example_file?(rel)

          ext = File.extname(rel)
          if (lang = LANGS[ext])
            @site.pages << example_page(full, rel, lang)
          elsif ext == ".csv"
            @site.pages << sheet_page(full, rel)
          end
        end
      end

      def web_example_file?(rel)
        dir = File.dirname(rel)
        dir != "." && File.exist?(File.join(source_root, dir, "index.html"))
      end

      def example_page(full, rel, lang)
        parsed = CellParser.parse(read(full), comment: lang["comment"])
        page = base_page(rel, parsed[:meta])
        page.data.merge!(
          "layout" => "lms-editor",
          "lang"   => lang["lang"],
          "cells"  => parsed[:cells].map(&:to_liquid)
        )
        add_sql_setup(page, rel, parsed[:meta]) if lang["lang"] == "sql"
        page
      end

      def sheet_page(full, rel)
        meta, lines = CellParser.extract_meta(read(full), comment: "#")
        page = base_page(rel, meta)
        page.data.merge!(
          "layout"    => "lms-sheet",
          "lang"      => "sheet",
          "csv"       => lines.join("\n"),
          "delimiter" => meta["delimiter"] || ","
        )
        page
      end

      def base_page(rel, meta)
        base = rel.delete_suffix(File.extname(rel))
        page = new_page(base)
        page.data.merge!(
          "title"           => meta["title"] || File.basename(base),
          "meta"            => meta,
          "nav_exclude"     => true,
          "search_exclude"  => true,
          "permalink"       => BooleanLmsKit.join_url(@config["url_prefix"], "#{base}.html"),
          "lms_kit"         => @config,
          "lms_source_path" => rel
        )
        page.content = ""
        page
      end

      # `-- schema: a.sql, b.sql` se incrusta en la página; `-- db: datos.sqlite` se publica como archivo.
      # Las rutas son relativas al archivo del ejemplo.
      def add_sql_setup(page, rel, meta)
        dir = File.dirname(rel)
        schemas = meta["schema"].to_s.split(",").map(&:strip).reject(&:empty?)
        page.data["setup_sql"] = schemas.filter_map do |path|
          file = resolve(dir, path, rel)
          file && "-- #{path}\n#{read(file)}"
        end.join("\n")

        return unless (db = meta["db"])

        file = resolve(dir, db, rel)
        page.data["db_url"] = publish_asset(file) if file
      end

      def resolve(dir, path, rel)
        full = File.expand_path(path, File.join(source_root, dir))
        unless full.start_with?(source_root + File::SEPARATOR)
          Jekyll.logger.error "LMS Kit:", "#{rel}: #{path} está fuera de #{@config['source']}/"
          return nil
        end
        return full if File.file?(full)

        Jekyll.logger.error "LMS Kit:", "#{rel}: no existe #{path}"
        nil
      end

      def publish_asset(full)
        rel = full.delete_prefix(source_root + File::SEPARATOR)
        @assets[rel] ||= begin
          asset = ExampleAsset.new(@site, source_root, rel, @config["url_prefix"])
          @site.static_files << asset
          asset.url
        end
      end

      def generate_slides
        root = @site.in_source_dir(@config["slides_source"])
        return unless File.directory?(root)

        Dir.glob("**/*.md", base: root).sort.each do |rel|
          base = rel.delete_suffix(".md")
          content = read(File.join(root, rel))
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

      def read(path)
        File.read(path, encoding: "UTF-8")
      end

      # `.html` para que Jekyll no pase el contenido por el conversor de Markdown.
      def new_page(base)
        Jekyll::PageWithoutAFile.new(@site, @site.source, File.dirname(base), "#{File.basename(base)}.html")
      end
    end

    # Archivo de `lms_kit.source` (p. ej. una base .sqlite) publicado bajo `url_prefix`.
    class ExampleAsset < Jekyll::StaticFile
      def initialize(site, source_root, rel, url_prefix)
        super(site, source_root, File.dirname(rel), File.basename(rel))
        @lms_url = BooleanLmsKit.join_url(url_prefix, rel)
      end

      def path
        File.join(@base, @dir, @name)
      end

      def url
        @lms_url
      end

      def destination(dest)
        @site.in_dest_dir(dest, Jekyll::URL.unescape_path(url))
      end
    end
  end
end
