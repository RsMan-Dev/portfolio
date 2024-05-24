class Pages::Homes::ShowComponent < ViewComponent::Base
  delegate :reactive_element, to: :helpers
  erb_template <<-ERB
    <%= reactive_element "HomeGame", ssr: false %>
  ERB
end