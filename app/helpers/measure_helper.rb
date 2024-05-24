module MeasureHelper
  def measure(&block)
    r = nil
    time = Benchmark.measure do
      r = block.call
    end
    puts time.real * 1000
    r
  end
end