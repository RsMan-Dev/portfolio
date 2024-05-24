

// this is a basic component, it uses signals to manage state
import {signal} from "./utils/signal";

export default function Hello() {
  // Here is the signal, it is a reactive variable, it can be read and written
  const count = signal(0);
  
  return (
    <div>
      {/* with signal, only the text is updated, not the whole component */}
      <h1>Hello.tsx component, count is {count()}</h1>
      {/* the onClick function updates the signal, and will trigger all dependant's updates and effects */}
      <button onClick={() => count.val ++}>count: {count()}</button>
    </div>
  );
}