# frozen_string_literal: true

module Jekyll
  module BooleanLmsKit
    ROOT = File.expand_path("../../..", __dir__)

    DEFAULTS = {
      "source"          => "_examples",
      "url_prefix"      => "/interactive",
      "slides_source"   => "_slides",
      "slides_prefix"   => "/slides",
      "quiz_source"     => "_quizzes",
      "quiz_prefix"     => "/quizzes",
      # Valores por defecto de los cuestionarios; cada archivo puede sobrescribirlos.
      "quiz"            => {
        "min_logro"        => 0.6,
        "mensaje_aprobado" => "¡Buen trabajo! Registra en tu bitácora qué pregunta te costó más y por qué.",
        "mensaje_repaso"   => "Te recomendamos repasar los contenidos de las preguntas marcadas y volver " \
                              "a intentarlo. Anota en tu bitácora qué vas a repasar.",
      },
      "pyodide_version" => "0.26.4",
      "entrypoints"     => {
        "python"     => "lms-python",
        "javascript" => "lms-javascript",
        "sql"        => "lms-sql",
        "sheet"      => "lms-sheet",
        "reveal"     => "lms-reveal",
        "mindmap"    => "lms-mindmap",
        "quiz"       => "lms-quiz",
      },
    }.freeze

    # Configuración efectiva: DEFAULTS mezclado con la clave `lms_kit:` de _config.yml.
    def self.config(site)
      Jekyll::Utils.deep_merge_hashes(DEFAULTS, site.config["lms_kit"] || {})
    end

    # Separa el front matter YAML del cuerpo: "---\na: 1\n---\ntexto" => [{"a" => 1}, "texto"].
    # Sin front matter (o con YAML inválido) devuelve [{}, texto completo].
    def self.split_front_matter(content)
      match = Jekyll::Document::YAML_FRONT_MATTER_REGEXP.match(content)
      return [{}, content] unless match

      data = SafeYAML.load(match[1])
      [data.is_a?(Hash) ? data : {}, match.post_match]
    rescue Psych::SyntaxError, SafeYAML::UnsupportedClass => e
      Jekyll.logger.warn "LMS Kit:", "front matter inválido: #{e.message.lines.first&.strip}"
      [{}, match ? match.post_match : content]
    end

    # Une prefijo y ruta relativa normalizando las barras: ("/interactive", "py/a") => "/interactive/py/a".
    def self.join_url(prefix, path)
      "/" + [prefix, path].map { |s| s.to_s.gsub(%r!\A/+|/+\z!, "") }.reject(&:empty?).join("/")
    end
  end
end
