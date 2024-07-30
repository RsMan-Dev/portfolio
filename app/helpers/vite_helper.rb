module ViteHelper
  def vite_tags
    safe_join([
      content_tag(:script) do
        <<-JS.html_safe
          window.default_locale = '#{I18n.locale}'
        JS
      end,
      vite_client_tag,
      vite_typescript_tag('application'),
      vite_stylesheet_tag('application'),
    ])
  end

  def image_tag(name, **options)
    begin

      options[:asset] = is_asset?(name) if options[:asset].nil?
      return super(name, options) unless options[:asset]

      name = "images/#{name}"
      if options[:srcset] && !options[:srcset].is_a?(String)
        options[:srcset] = options[:srcset].map do |src_name, size|
          "#{asset_path(src_name)} #{size}"
        end.join(', ')
      end

      super(asset_path(name), options)
    rescue ViteRuby::Error
      puts "Error loading #{name}" unless Rails.env.test? # TODO: contact sentry if enabled
    end
  end

  def asset_path(name, **options)
    path_to_asset vite_manifest.path_for(name, **options)
  end

  def asset_url(name, **options)
    url_to_asset vite_manifest.path_for(name, **options)
  end

  def is_asset?(name)
    if name.is_a?(String)
      name.exclude?('/rails/active_storage')
    else
      false
    end
  end
end
