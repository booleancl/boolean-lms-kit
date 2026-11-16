# frozen_string_literal: true

module Jekyll
  module BooleanLmsKit
    INCLUDES_DIR = File.join(ROOT, "_includes")
    LAYOUTS_DIR  = File.join(ROOT, "_layouts")

    # Jekyll::Layout fuerza la ruta dentro de site.source (o del theme); esta variante
    # lee el archivo directamente desde la carpeta _layouts del gem.
    class GemLayout < Jekyll::Layout
      # rubocop:disable Lint/MissingSuper
      def initialize(site, base, name)
        @site = site
        @base = base
        @name = name
        @base_dir = ROOT
        @path = File.join(base, name)
        @relative_path = @path.delete_prefix(ROOT)
        self.data = {}
        process(name)
        read_yaml(base, name)
      end
      # rubocop:enable Lint/MissingSuper
    end

    # Los includes del gem quedan al final: un sitio puede sobrescribirlos con su propio _includes/.
    Jekyll::Hooks.register :site, :after_init do |site|
      paths = site.includes_load_paths
      paths << INCLUDES_DIR unless paths.frozen? || paths.include?(INCLUDES_DIR)
    end

    # Registra los layouts del gem sin pisar los que el sitio (o su theme) ya define.
    Jekyll::Hooks.register :site, :post_read do |site|
      Dir.glob("*.html", base: LAYOUTS_DIR).each do |file|
        name = File.basename(file, ".html")
        next if site.layouts.key?(name)

        site.layouts[name] = GemLayout.new(site, LAYOUTS_DIR, file)
      end
    end
  end
end
