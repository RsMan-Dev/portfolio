class ApplicationController < ActionController::Base
  layout "application"
  PAGE_COMPONENTS_PATH = "pages/"

  def self.layout_name = @layout_name ||= "application"
  def self.layout(layout, **options)
    @layout_name = layout
    super(layout, **options)
  end

  def path_to_component_name(path) = "#{PAGE_COMPONENTS_PATH}#{path}_component".split('/').map(&:camelcase).join("::")
  def path_to_component(path) = path_to_component_name(path).safe_constantize
  def render_page_component_with_lyt(component_path, with_layout: true)
    component = path_to_component(component_path)&.new

    return component unless with_layout && component

    layout_path = "layouts/#{self.class.layout_name}"
    layout = path_to_component(layout_path)

    raise "Layout #{path_to_component_name(layout_path)} not found, but required in \#render_component" unless layout

    layout.new.with_content(component)
  end

  def render_page_component_with_lyt!(component_path, with_layout: true)
    str = render_page_component_with_lyt(component_path, with_layout:)
    return str if str

    raise "Component #{path_to_component_name(component_path)} not found"
  end

  def render_page_component(component_path, with_layout: true)
    comp = render_page_component_with_lyt(component_path, with_layout:)
    render comp, layout: !with_layout if str
  end

  def render_page_component!(component_path, with_layout: true)
    comp = render_page_component_with_lyt!(component_path, with_layout:)
    render comp, layout: !with_layout
  end

  def render_component_from_action(with_layout: true)
    render_page_component!("#{controller_name}/#{action_name}", with_layout:)
  end

  def default_render
    render_component_from_action
  rescue
    Rails.logger.info "Component #{path_to_component_name("#{controller_name}/#{action_name}")} not found, rendering default layout"
    super
  end
end
