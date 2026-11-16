# frozen_string_literal: true

require_relative "lib/jekyll/boolean_lms_kit/version"

Gem::Specification.new do |spec|
  spec.name          = "jekyll-boolean-lms-kit"
  spec.version       = Jekyll::BooleanLmsKit::VERSION
  spec.authors       = ["Academia Boolean SpA"]
  spec.summary       = "Layouts, includes y generator para sitios LMS Jamstack con Jekyll."
  spec.description   = "Editores interactivos de Python/JS escritos en archivos de su lenguaje, " \
                       "diapositivas reveal.js y shortcodes de iframe para sitios Jekyll."
  spec.homepage      = "https://boolean.cl"
  spec.license       = "MIT"
  spec.required_ruby_version = ">= 3.0"

  spec.files = Dir["lib/**/*.rb", "_layouts/**/*", "_includes/**/*", "README.md", "LICENSE"]
  spec.require_paths = ["lib"]

  spec.add_dependency "jekyll", ">= 4.3", "< 5"

  spec.add_development_dependency "minitest", "~> 5.0"
  spec.add_development_dependency "rake", "~> 13.0"
end
