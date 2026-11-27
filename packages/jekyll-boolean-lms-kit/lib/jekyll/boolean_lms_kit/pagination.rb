# frozen_string_literal: true

module Jekyll
  module BooleanLmsKit
    # Paginación "anterior / siguiente" que recorre el árbol de navegación de just-the-docs
    # (inicio → secciones → páginas hijas) en el orden del menú lateral. Deja en cada página
    # `page.prev_page` y `page.next_page` ({"title", "url"}), que muestra `lms-kit/page-nav.html`.
    #
    # Solo participan las páginas bajo `lms_kit.pagination.root` (y la portada) que tienen `title`
    # y no tienen `nav_exclude`. Se desactiva con `lms_kit.pagination: false`.
    module Pagination
      module_function

      def apply(site)
        options = BooleanLmsKit.config(site)["pagination"]
        return unless options

        pages = sequence(site.pages, root: options["root"])
        pages.each_with_index do |page, i|
          page.data["prev_page"] = link(pages[i - 1]) if i.positive?
          page.data["next_page"] = link(pages[i + 1]) if pages[i + 1]
        end
      end

      # Páginas en orden de recorrido. Una página cuyo `parent` no existe queda fuera.
      def sequence(pages, root:)
        prefix = BooleanLmsKit.join_url(root, "")
        prefix += "/" unless prefix.end_with?("/")
        navigable = pages.select do |p|
          p.data["title"] && !p.data["nav_exclude"] && (p.url == "/" || p.url.start_with?(prefix))
        end

        by_title = navigable.group_by { |p| p.data["title"] }
        children = {}.compare_by_identity
        roots = []
        navigable.each do |page|
          next roots << page unless page.data["parent"]

          parent = find_parent(page, by_title)
          (children[parent] ||= []) << page if parent
        end

        result = []
        sort(roots).each { |page| walk(page, children, result) }
        result
      end

      # El título puede repetirse entre secciones: `grand_parent` y `ancestor` las distinguen.
      def find_parent(page, by_title)
        candidates = (by_title[page.data["parent"]] || []).reject { |c| c.equal?(page) }
        grand_parent = page.data["grand_parent"]
        candidates = candidates.select { |c| c.data["parent"] == grand_parent } if grand_parent
        if (ancestor = page.data["ancestor"])
          candidates = candidates.select { |c| descends_from?(c, ancestor, by_title) }
        end
        # Sin `grand_parent`, se prefiere una sección de primer nivel.
        candidates.find { |c| c.data["parent"].nil? } || candidates.first
      end

      def descends_from?(page, title, by_title, seen = [])
        return true if page.data["title"] == title || page.data["parent"] == title
        return false if page.data["parent"].nil? || seen.include?(page.data["parent"])

        (by_title[page.data["parent"]] || []).any? do |p|
          descends_from?(p, title, by_title, seen + [page.data["parent"]])
        end
      end

      # Primero `nav_order` numérico, luego de texto y al final las páginas sin orden (por título).
      def sort(pages)
        pages.sort_by do |p|
          order = p.data["nav_order"]
          group = case order
                  when nil then 2
                  when Numeric then 0
                  else 1
                  end
          [group, group.zero? ? order : 0, group == 1 ? order.to_s : "", p.data["title"].to_s]
        end
      end

      def walk(page, children, result)
        result << page
        sort(children[page] || []).each { |child| walk(child, children, result) }
      end

      def link(page)
        { "title" => page.data["title"], "url" => page.url }
      end
    end
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  Jekyll::BooleanLmsKit::Pagination.apply(site)
end
