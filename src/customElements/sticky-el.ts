function xy(event: TouchEvent | MouseEvent): [number, number] {
  const ctn = "touches" in event ? event.touches[0] : event
  return [ctn?.clientX ?? -100, ctn?.clientY ?? -100]
}

function relativePos(el: HTMLElement, x: number, y: number, center = false): [number, number] {
  const rect = el.getBoundingClientRect()
  const style = window.getComputedStyle(el);
  const matrix = new WebKitCSSMatrix(style.transform);
  x = x - rect.left + matrix.m41 - (center ? rect.width : 0) / 2
  y = y - rect.top + matrix.m42 - (center ? rect.height : 0) / 2
  return [x, y]
}

function setCursorStyle(el: HTMLElement, ...xyOrFrom: [HTMLElement] | [number, number]) {
  let x: number, y: number, width = undefined, height = undefined, radius = undefined
  if(xyOrFrom.length == 1) {
    const elRect = el.getBoundingClientRect()
    const sRect = xyOrFrom[0].getBoundingClientRect()
    x = sRect.left + sRect.width / 2 - elRect.left
    y = sRect.top + sRect.height / 2 - elRect.top
    width = sRect.width
    height = sRect.height
    radius = getComputedStyle(xyOrFrom[0]).borderRadius
  } else {
    x = xyOrFrom[0]
    y = xyOrFrom[1]
  }

  if(x) el.style.setProperty("--c-x", `${x}px`)
  else el.style.removeProperty("--c-x")
  if(y) el.style.setProperty("--c-y", `${y}px`)
  else el.style.removeProperty("--c-y")
  if(width) el.style.setProperty("--c-w", typeof width === "number" ? `${width}px` : width)
  else el.style.removeProperty("--c-w")
  if(height) el.style.setProperty("--c-h", typeof height === "number" ? `${height}px` : height)
  else el.style.removeProperty("--c-h")
  if(radius) el.style.setProperty("--c-r", typeof radius === "number" ? `${radius}px` : radius)
  else el.style.removeProperty("--c-r")
}

class SitckyEl extends HTMLElement {
  constructor() {
    super()
    const start = ({currentTarget: el}: MouseEvent | TouchEvent) => {
      if(!(el instanceof HTMLElement)) return
      el.style.transition = "transform 0.1s"
      setTimeout(()=> el.style.transition = "", 100)
      if(this.hasAttribute("factor")) el.style.setProperty("--factor", this.getAttribute("factor") ?? "0.5")
    }
    const mv = (e: MouseEvent | TouchEvent) => setCursorStyle(this, ...relativePos(this, ...xy(e), true))
    const end = (_: MouseEvent | TouchEvent) => setTimeout(() => setCursorStyle(this, 0, 0))
    this.addEventListener("mouseenter", start, {passive: true})
    this.addEventListener("touchstart", start, {passive: true})
    this.addEventListener("mousemove", mv, {passive: true})
    this.addEventListener("touchmove", mv, {passive: true})
    this.addEventListener("mouseleave", end, {passive: true})
    this.addEventListener("touchend", end, {passive: true})
  }
}
customElements.define("sticky-el", SitckyEl)

let followInterval = undefined as number | undefined
let followedEl = undefined as HTMLElement | undefined
const mv = (e: MouseEvent | TouchEvent) => {
  if(!(e.target instanceof HTMLElement) || !(e.currentTarget instanceof HTMLElement)) return
  const t = e.currentTarget, se = e.target.closest("sticky-el")
  if(followedEl && followedEl !== e.target) // noinspection JSVoidFunctionReturnValueUsed
    followInterval = clearInterval(followInterval) as undefined

  t.style.setProperty("--c-opacity", "1");
  if(se instanceof SitckyEl) {
    setCursorStyle(t, se)
    followedEl = e.target
    if(!followInterval) followInterval = setInterval(() => setCursorStyle(t, se), 10)
  } else {
    followedEl = undefined
    // noinspection JSVoidFunctionReturnValueUsed
    followInterval = clearInterval(followInterval) ?? undefined
    setCursorStyle(t, ...relativePos(t, ...xy(e)))
  }
}
let lastY = 0
window.addEventListener("scroll", (_) => {
  const currCY = document.body.style.getPropertyValue("--c-y")
  const delta = window.scrollY - lastY
  lastY = window.scrollY
  if(currCY) document.body.style.setProperty("--c-y", `${parseInt(currCY) + delta}px`)
}, {passive: true})
document.body.addEventListener("mousemove", mv, {passive: true})
document.body.addEventListener("touchmove", mv, {passive: true})
const end = (e: MouseEvent | TouchEvent) => {
  if(!followedEl && e.currentTarget instanceof HTMLElement) e.currentTarget.style.removeProperty("--c-opacity")
}
document.body.addEventListener("mouseleave", end, {passive: true})
document.body.addEventListener("touchend", end, {passive: true})
document.body.addEventListener("click", end, {passive: true})


const css = `
  html, body{height: 100%;}
  body{
    --c-x: 0px;
    --c-y: 0px;
    --c-r: 1.5rem;
    --c-w: 2rem;
    --c-h: 2rem;
    --transition: 0.15s;
    --c-delta: 0.5rem;
    --c-opacity: 0;
    cursor: none;
    position: relative;
  }
  body::after{
    content: "";
    pointer-events: none;
    backdrop-filter: invert(1);
    position: absolute;
    overflow: clip;
    left: var(--c-x);
    top: var(--c-y);
    border-radius: var(--c-r);
    width: calc(var(--c-w) + var(--c-delta) * 2);
    height: calc(var(--c-h) + var(--c-delta) * 2);
    transform: translate(-50%, -50%);
    transition: width var(--transition), height var(--transition), border-radius var(--transition), opacity var(--transition);
    z-index: 2147483647;
    opacity: var(--c-opacity);
  }
  body:active{
    --c-delta: 0.25rem;
  }
  
  .btn {
    padding: 0.5rem 2rem;
    border: 1px solid #888;
    background-color: #AAA;
    font-size: 2rem;
  }
  
  sticky-el{
    display: block;
    --c-x: 0px;
    --c-y: 0px;
    --factor: 0.5;
    transform: translate(calc(var(--factor) * var(--c-x)), calc(var(--factor) * var(--c-y)))
  }
  sticky-el:not(:hover){
    transition: transform 0.3s;
  }
`
const style = document.createElement("style")
style.innerHTML = css
document.head.insertAdjacentElement("beforeend", style)

declare global {
  interface HTMLElementTagNameMap {
    "sticky-el": SitckyEl
  }
}

export default SitckyEl