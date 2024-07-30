class ApplicationController < ActionController::Base
  class << self
    attr_writer :layout_name

    def layout_name
      @layout_name ||= "application"
    end

    def self.layout(name, **options)
      self.layout_name = name
      super(name, **options)
    end
  end
  layout "application"

  def template_path = "Templates::"

  def controller_name_to_constant = controller_name.split("/").map(&:camelize).join("::")

  def component_name = "#{template_path}#{controller_name_to_constant}::#{action_name.camelize}Component"

  def layout_component_name = "#{template_path}Layouts::#{self.class.layout_name.camelize}Component"

  #wants to render a view component instead of a layout
  def default_render
    @component = component_name.constantize.new
    @layout = layout_component_name.constantize.new

    render @layout.with_content(@component),
           layout: false
  end
end
