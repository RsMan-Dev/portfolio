module ViteHelper
  def hide_script = "window.hide = (el) => { el.style.opacity = '0' };".html_safe

  def vite_tags
    safe_join([
      vite_client_tag,
      vite_typescript_tag('application'),
      vite_stylesheet_tag('application'),
      tag.script(hide_script),
    ])
  end

  def fallback_asset_image_tag(name, **options)
    if options[:fallback].nil? || Rails.root.join('app', 'assets', 'images', name).exist?
      name
    else
      options.delete(:fallback)
    end
  end

  def image_tag(name, **options)
    options[:asset] = is_asset?(name) if options[:asset].nil?
    options[:onerror] ||= 'hide(this)'
    name = fallback_asset_image_tag name, **options
    return super(name, options) unless options.delete(:asset)

    name = "images/#{name}"
    if options[:srcset] && !options[:srcset].is_a?(String)
      options[:srcset] = options[:srcset].map do |src_name, size|
        "#{asset_path(src_name)} #{size}"
      end.join(', ')
    end

    super(asset_path(name), options)
  end

  @@max_tries_happened = 0
  @@chdir_errors = 0

  def asset_path(name, **options)
    tries = 0
    begin
      a = cached_asset_path_to(name, **options)
      if (@@chdir_errors.positive? || @@max_tries_happened.positive?) && Rails.env.development?
        Rails.logger.info "Assets chdir conflicted #{@@chdir_errors} times, and max tries happened was #{@@max_tries_happened} times"
      end
      a
      # sometimes in concurrence, ActionView::Template::Error (conflicting chdir during another chdir block) is raised
      # we want to retry in this case, to avoid the error, waiting the fix from the gem
    rescue RuntimeError => e
      tries += 1
      raise if tries > 5 || e.message.exclude?('conflicting chdir during another chdir block')

      if Rails.env.development?
        @@max_tries_happened = tries if tries > @@max_tries_happened
        @@chdir_errors += 1
        Rails.logger.info "Chdir conflicted! Max concurrent tries happened: #{@@max_tries_happened}, and chdir errors: #{@@chdir_errors}"
      end

      sleep 0.1
      retry
    end
  rescue StandardError
    raise unless options[:fallback]

    asset_path options.delete(:fallback).to_s, **options
  end

  # caches urls for assets
  def cached_asset_path_to(name, **options)
    Rails.cache.fetch("vite_asset_path_#{name}", expires_in: 30) do
      begin
        path_to_asset vite_manifest.path_for(name, **options)
      rescue ViteRuby::Error
        Rails.logger.error "Error finding vite asset #{name}, returning empty" unless Rails.env.test? # TODO: contact sentry if enabled
        ""
      end
    end
  end

  def asset_url(name, **options)
    url_to_asset vite_manifest.path_for(name, **options)
  rescue StandardError
    raise unless options[:fallback]

    asset_path options.delete(:fallback).to_s, **options
  end

  def is_asset?(name)
    if name.is_a?(String)
      name.exclude?('/rails/active_storage')
    else
      false
    end
  end
end
