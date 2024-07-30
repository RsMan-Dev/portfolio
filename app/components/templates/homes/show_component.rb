# frozen_string_literal: true

module Templates
  module Homes
    class ShowComponent < ViewComponent::Base

      erb_template <<~ERB
        <h1>Hello, World!</h1>
      ERB
    end
  end
end
