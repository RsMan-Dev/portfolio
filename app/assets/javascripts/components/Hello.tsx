import { createSignal } from "solid-js";

export default function Hello() {
  const [count, setCount] = createSignal(0);
  return (
    <div>
      <button onClick={() => setCount(count() + 1)}>count: {count()}</button>
    </div>
  );
}