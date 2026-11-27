# frozen_string_literal: true

module Jekyll
  module BooleanLmsKit
    # Lee y valida un cuestionario en YAML. Acepta una lista de preguntas, o un mapa con
    # `preguntas:` más opciones (`title`, `min_logro`, `mensaje_aprobado`, `mensaje_repaso`).
    #
    #   - ae: 1                      # opcional: aprendizaje esperado
    #     pregunta: ¿...?
    #     opciones:
    #       - texto: Una
    #         feedback: Por qué      # opcional
    #         correcta: true         # exactamente una por pregunta
    #       - texto: Otra
    module QuizParser
      class Error < StandardError; end

      module_function

      # Devuelve [opciones del archivo, preguntas].
      def parse(source)
        data = SafeYAML.load(source.to_s)
        meta, items = data.is_a?(Hash) ? [data.reject { |k, _| k == "preguntas" }, data["preguntas"]] : [{}, data]
        raise Error, "no tiene preguntas" unless items.is_a?(Array) && !items.empty?

        [meta, items.each_with_index.map { |item, i| question(item, i + 1) }]
      rescue Psych::SyntaxError => e
        raise Error, "YAML inválido: #{e.message}"
      end

      def question(item, number)
        raise Error, "pregunta #{number}: falta `pregunta`" unless item.is_a?(Hash) && filled?(item["pregunta"])

        options = item["opciones"]
        unless options.is_a?(Array) && options.size >= 2 && options.all? { |o| o.is_a?(Hash) && filled?(o["texto"]) }
          raise Error, "pregunta #{number}: `opciones` necesita al menos dos alternativas con `texto`"
        end
        unless options.count { |o| o["correcta"] == true } == 1
          raise Error, "pregunta #{number}: debe haber exactamente una opción con `correcta: true`"
        end

        {
          "ae"       => item["ae"],
          "pregunta" => item["pregunta"].to_s,
          "opciones" => options.map do |o|
            { "texto" => o["texto"].to_s, "feedback" => o["feedback"].to_s, "correcta" => o["correcta"] == true }
          end,
        }
      end

      def filled?(value)
        !value.nil? && !value.to_s.strip.empty?
      end
    end
  end
end
