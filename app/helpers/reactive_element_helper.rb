module ReactiveElementHelper
  def reactive_element(name, _props = {}, ssr: true, **options)
    # ssr = true if Rails.env.development?
    props = _props.to_json
    raise "You must add execjs gem to your Gemfile to use SSR" if ssr && !defined?(ExecJS)

    if ExecJS.runtime != ExecJS::Runtimes::MiniRacer
      begin
        ExecJS.runtime = ExecJS::Runtimes::MiniRacer
      rescue
        Rails.logger.warn "Other runtimes than mini_racer are pretty slow, you should consider using it instead" if Rails.env.development? && ssr
      end
    end

    comp, logs = if ssr
      if Rails.env.development?
        measure_and_log("  [SSR] Rendered #{name} reactive component - Duration: ") do
          exec_js.eval("[renderComponent('#{name}', #{props}), getLogs()]")
        end
      else
        exec_js.eval("[renderComponent('#{name}', #{props}), getLogs()]")
      end
    else
      nil
    end

    # Log replay
    repeated_log = nil
    repeat_count = 0
    logs&.each do |log|
      log["args"] = log["args"].join(' ')
      log["args"] = "<nothing>" if log["args"] == ""
    end
    logs&.each_with_index do |log, i|
      log_type = log["type"].to_sym
      log_type = :info if log_type == :log
      if log["args"] == logs[i + 1]&.[]("args")
        repeated_log = log
        repeat_count += 1
        next
      end
      if repeated_log == log["args"]
        repeat_count += 1
        next
      end
      if repeated_log
        Rails.logger.send(log_type, "  [SSR] #{name} log: - #{repeated_log["args"]} (repeated #{repeat_count + 1} times)")
        repeated_log = nil
        repeat_count = 0
        next
      end
      Rails.logger.send(log_type, "  [SSR] #{name} log: - #{log["args"]}")
    end

    content_tag(
      :'reactive-element',
      comp&.html_safe,
      name: name,
      props: Base64.encode64(Zlib.gzip(props)).tr("\n", ""),
      ssr: ("" if ssr),
      **options
    )

    # rescue ExecJS::ProgramError => e
    #   raise ExecJS::ProgramError, e.message + "\n [SSR] Error while rendering #{name} component with props #{props}"
  end

  def hydration_script
    return exec_js.eval("generateHydrationScript()").html_safe unless Rails.env.development?
    measure_and_log("  [SSR] Rendered hydration script - Duration: ") do
      exec_js.eval("generateHydrationScript()").html_safe
    end
  end

  private
    def global_ctx = ActiveSupport::IsolatedExecutionState[:reactive_elements_ssr_ctx] ||= nil
    def global_ctx=(ctx)
      ActiveSupport::IsolatedExecutionState[:reactive_elements_ssr_ctx] = ctx
    end

    def get_ssr_js
      File.read(Rails.root.join("app/assets/builds/server.js"))
    end

    def exec_js
      ctx = self.global_ctx
      return ctx[:inst] if !Rails.env.development? && ctx.present?
      if Rails.env.development?
        ssr_js = get_ssr_js
        js_hash = Digest::SHA1.hexdigest(ssr_js)
        if ctx && ctx[:hash] == js_hash
          return ctx[:inst]
        else
          self.global_ctx = { hash: js_hash, inst: compile_new_js(ssr_js) }
          return self.global_ctx[:inst]
        end
      else
        self.global_ctx = { inst: compile_new_js(get_ssr_js) }
        return self.global_ctx[:inst]
      end
    end

    def exec_js_with_timeout(js)
      return compile_new_js(js) unless Rails.env.development?
      measure_and_log("  [SSR] Server js compilation with #{ExecJS.runtime.class.name} - Duration: ") do
        compile_new_js(js)
      end
    end

    def compile_new_js(js)
      _jsprep = js
        .gsub("sharedConfig.context.noHydrate = true;", "if(sharedConfig.context){sharedConfig.context.noHydrate = true;}")
        .gsub("sharedConfig.context.assets", "sharedConfig.context ? sharedConfig.context.assets : []")
      ExecJS.compile(
        <<~JS.gsub("debug: false", Rails.env.development? ? "debug: true" : "debug: false") + _jsprep
          function setTimeout(callback) {callback();}
          const logs = [];
          var _console = {
            warn: function(...ag) {logs.push({type: 'warn', args: ag.map(a => JSON.stringify(a))})},
            log: function(...ag) {logs.push({type: 'log', args: ag.map(a => JSON.stringify(a))})},
            error: function(...ag) {logs.push({type: 'error', args: ag.map(a => JSON.stringify(a))})}
          }
          if(!console){
            var console = _console;
          } else {
            for (var key in _console) {
              console[key] = _console[key];
            }
          }
          const window = {location: {href: ''}, debug: false};
          const getLogs = () => {
            const l = [...logs];
            logs.length = 0;
            return l;
          };
        JS
      )
    end

    def measure_and_log(label, &block)
      tr = nil
      tms = Benchmark.measure(label) do
        tr = yield
      end
      Rails.logger.info "#{tms.label} #{(tms.real * 1000).round(2)}ms"
      tr
    end
end