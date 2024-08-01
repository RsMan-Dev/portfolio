# frozen_string_literal: true

module Templates
  module Layouts
    class ApplicationComponent < ViewComponent::Base
      erb_template <<~ERB
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sandbox</title>
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <%= csrf_meta_tags %>
            <%= helpers.csp_meta_tag %>
        
            <%= helpers.vite_tags %>
          </head>
        
          <body>
            <%= content.is_a?(ViewComponent::Base) ? render(content) : content %>
          </body>
        </html>
      ERB
    end
  end
end
