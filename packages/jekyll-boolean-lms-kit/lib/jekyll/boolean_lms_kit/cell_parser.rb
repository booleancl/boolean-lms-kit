# frozen_string_literal: true

module Jekyll
  module BooleanLmsKit
    # Separa un archivo de ejemplo en metadatos y celdas, estilo Jupytext "percent":
    #
    #   # title: Variables          <- metadatos (solo al inicio, antes de la primera celda)
    #   # %% Asignación            <- inicia celda (título opcional)
    #   x = 1
    #
    # Sin marcadores `%%`, todo el código (sin los metadatos) es una sola celda.
    module CellParser
      Cell = Struct.new(:title, :code, keyword_init: true) do
        def to_liquid
          { "title" => title, "code" => code }
        end
      end

      module_function

      def parse(source, comment: "#")
        c = Regexp.escape(comment)
        meta_re = %r!\A\s*#{c}\s*([A-Za-z_][\w-]*):\s*(.*?)\s*\z!
        cell_re = %r!\A\s*#{c}\s*%%(.*)\z!

        lines = source.to_s.gsub("\r\n", "\n").split("\n", -1)
        meta = {}
        while (line = lines.first)
          if (m = line.match(meta_re))
            meta[m[1]] = m[2]
            lines.shift
          elsif line.strip.empty? && !meta.empty?
            lines.shift
          else
            break
          end
        end

        cells = []
        current = nil
        preamble = []
        lines.each do |line|
          if (m = line.match(cell_re))
            cells << current if current
            title = m[1].strip
            current = { title: title.empty? ? nil : title, lines: [] }
          elsif current
            current[:lines] << line
          else
            preamble << line
          end
        end
        cells << current if current

        if cells.empty?
          cells = [{ title: nil, lines: preamble }]
        elsif preamble.any? { |l| !l.strip.empty? }
          cells.unshift({ title: nil, lines: preamble })
        end

        { meta: meta, cells: cells.map { |h| Cell.new(title: h[:title], code: trim(h[:lines])) } }
      end

      def trim(lines)
        lines = lines.drop_while { |l| l.strip.empty? }
        lines = lines.reverse.drop_while { |l| l.strip.empty? }.reverse
        lines.join("\n") + "\n"
      end
    end
  end
end
