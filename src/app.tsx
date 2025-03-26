import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import {isServer} from "solid-js/web";

export default function App() {
  if(!isServer){
    import("./customElements/sticky-el")
    if(!("ScrollTimeline" in window)) {
      fetch('https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js').then(res => res.text()).then(scrollTimelinePolyfill => {
        // patch potential infinity number when document is not scrollable

        // patches : <v>.animation.currentTime = <a> + <t>
        // to : <v>.animation.currentTime = (<a> + <t>) || 0
        // will avoid NaN to pass, and will set 0 if the result is NaN
        scrollTimelinePolyfill = scrollTimelinePolyfill.replace(
          /(?<vName>[^.]+)\.animation\.currentTime\s*=\s*(?<aName>[^\s+]+)\s*\+\s*(?<tName>[^\s}]+)/,
          (...match) => {
            const {vName, aName, tName} = match.at(-1)
            return `${vName}.animation.currentTime = (${aName} + ${tName}) || 0`
          }
        )

        // patches a : new ResizeObserver(() => {<f>(<v>.source)}).[...]
        // to : new ResizeObserver(() => {<v>.source && <f>(<v>.source)}).[...]
        // will avoid error when <v>.source is undefined, we are ignoring the error
        scrollTimelinePolyfill = scrollTimelinePolyfill.replace(
          /new\s*ResizeObserver\(\s*\(?\s*\(\s*\)\s*=>\s*{\s*(?<fName>[^(]*)\(\s*(?<vName>[^(]*)\.source\s*\)\s*}\s*\)?\s*\)\s*\./,
          (...match) => {
            const {fName, vName} = match.at(-1)
            return `new ResizeObserver((() => {${vName}.source && ${fName}(${vName}.source)})).`
          }
        )

        eval(scrollTimelinePolyfill)
      })
    }
  }

  return (
    <Router
      root={props => (
        <MetaProvider>
          <Suspense>{props.children}</Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
