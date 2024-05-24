# frozen_string_literal: true

class Pages::Layouts::ApplicationComponent < ViewComponent::Base

  def active_link(text, path, **options)
    active = request.path == path
    link_to text, path, class: (active ? "active " : "") + (options[:class] || "")
  end

  erb_template <<-ERB
    <!doctype html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Component</title>
        
        <%= helpers.csrf_meta_tags %>
        <%= helpers.csp_meta_tag %>
        <%= helpers.vite_tags %>
      </head>
      <body>
        <header><h1>We are in layout!</h1></header>
        <main>
          <%= content.is_a?(ViewComponent::Base) ? render(content) : content %>
        </main>
        <%= helpers.toasts %>
      </body>
    </html>
  ERB
end
