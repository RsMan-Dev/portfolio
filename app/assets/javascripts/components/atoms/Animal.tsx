import {CustomStore, signal, Storable, unindexedArrayStore} from "../utils/signal";
import {throttle} from "../../utils/debounce_and_throttle";
import {isServer} from "solid-js/web";
import {createEffect, untrack} from "solid-js";

type BodyPart = {
  size: number;
  position: {x: number, y: number};
}


interface AnimalProps {
  color: string
  dots: {size: number}[];
  dotDistance: number;
  at?: {x: number, y: number};
}
export default function Animal({color, dots, dotDistance, at}: AnimalProps){
  let disposed = false
  const position = signal(at || {x: window.innerWidth / 2, y: window.innerHeight / 2})
  const target = signal(position())
  const body = unindexedArrayStore([] as BodyPart[]);
  body(dots.map((d) => ({
    ...d,
    position(this: CustomStore<BodyPart>, old){
      const i = body().indexOf(this)
      if(i == -1) return {x: 0, y: 0}
      else if(i == 0) return position()
      else {
        const prev = body.peek()[i - 1].position
        if(old === undefined) return {x: prev.x, y: prev.y - dotDistance}
        const distance = Math.sqrt((prev.x - old.x) ** 2 + (prev.y - old.y) ** 2)
        if(distance == dotDistance) return prev
        else {
          const angle = Math.atan2(prev.y - old.y, prev.x - old.x)
          return {x: prev.x - Math.cos(angle) * dotDistance, y: prev.y - Math.sin(angle) * dotDistance}
        }
      }
    }
  }) as Storable<BodyPart>))
  let head: HTMLDivElement | null = null;

  function lerp(a: number, b: number, t: number){
    return a + (b - a) * t
  }

  const move = throttle((x: number, y: number) => {
    target({x, y})
  }, 1000 / 120)


  function slightlyMoveToTarget(){
    const pos = position.peek()
    const tar = target.peek()
    const targetX = Math.round(lerp(pos.x, tar.x, 0.1) * 100) / 100
    const targetY = Math.round(lerp(pos.y, tar.y, 0.1) * 100) / 100
    if(position.peek().x == targetX && position.peek().y == targetY) return
    position({x: targetX, y: targetY})
    console.log("moved")
  }

  function frame(){
    slightlyMoveToTarget()
  }
  function af(){
    frame()
    if(disposed) return
    requestAnimationFrame(af)
  }
  if(!isServer) createEffect(() => {
    untrack(() => {
      requestAnimationFrame(af)
    })
    return () => {
      disposed = true
    }
  })

  return <>
    <div
      style={{height: "100%", position: "relative", "z-index": 1}}
      onMouseMove={(e) => { if (e.buttons == 1) move(e.clientX, e.clientY) }}
    >
      {body().map((dot, i) => <div
        style={{
          position: "absolute",
          width: dot.size + "px",
          height: dot.size + "px",
          "background-color": color || "black",
          "border-radius": "50%",
          left: (dot.position.x - dot.size / 2) + "px",
          top: (dot.position.y - dot.size / 2) + "px",
          "z-index": i
        }}
        ref={i == 0 ? (e) => head = e : undefined}
      ></div>)}
    </div>
  </>
}