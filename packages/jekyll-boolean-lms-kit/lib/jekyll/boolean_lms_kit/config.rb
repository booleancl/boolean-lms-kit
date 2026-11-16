# frozen_string_literal: true

module Jekyll
  module BooleanLmsKit
    ROOT = File.expand_path("../../..", __dir__)

    DEFAULTS = {
      "source"          => "_examples",
      "url_prefix"      => "/interactive",
      "slides_source"   => "_slides",
      "slides_prefix"   => "/slides",
      "pyodide_version" => "0.26.4",
      "entrypoints"     => {
        "python"     => "lms-python",
        "javascript" => "lms-javascript",
        "sql"        => "lms-sql",
        "sheet"      => "lms-sheet",
        "reveal"     => "lms-reveal",
      },
    }.freeze

    # Configuración efectiva: DEFAULTS mezclado con la clave `lms_kit:` de _config.yml.
    def self.config(site)
      Jekyll::Utils.deep_merge_hashes(DEFAULTS, site.config["lms_kit"] || {})
    end

    # Une prefijo y ruta relativa normalizando las barras: ("/interactive", "py/a") => "/interactive/py/a".
    def self.join_url(prefix, path)
      "/" + [prefix, path].map { |s| s.to_s.gsub(%r!\A/+|/+\z!, "") }.reject(&:empty?).join("/")
    end
  end
end
