module ToastHelper
  def toasts(**options)
    tag.div id: :toasts do
      toasts_data(**options)
    end
  end

  def toasts_data(**options)
    toast_messages = flash.map do |type, msg|
      toast type, msg, **options
    end
    flash.clear

    toast_messages.join.html_safe
  end

  private

  def toast(type, message, **options)
    reactive_element(
      "Toast",
      {
        message: message,
        title: t("toasts.type.#{type}"),
      }.merge(options[:timeout] ? { timeout: options[:timeout] } : {}),
      align: options[:align] || "right",
      type: type,
    )
  end
end