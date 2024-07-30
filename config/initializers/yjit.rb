# In production server configurations
if defined?(RubyVM::YJIT) && RubyVM::YJIT.respond_to?(:enable)
  RubyVM::YJIT.enable
else
  puts "YJIT is not enabled"
end