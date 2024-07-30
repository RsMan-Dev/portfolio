# frozen_string_literal: true

module Templates
  module Homes
    class ShowComponent < ViewComponent::Base
      delegate :reactive_element, to: :helpers

      erb_template <<~ERB
        <%= reactive_element "Fish" %>
      ERB
    end
  end
end
