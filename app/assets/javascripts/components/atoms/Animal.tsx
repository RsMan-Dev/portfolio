import {computed, CustomStore, signal, Storable, unindexedArrayStore} from "../utils/signal";
import {throttle} from "../../utils/debounce_and_throttle";
import {isServer} from "solid-js/web";
import {createEffect, untrack} from "solid-js";

type Position = {x: number, y: number}

type CardinalPositions = {
  front: Position,
  frontRight: Position,
  right: Position,
  backRight: Position,
  back: Position,
  backLeft: Position,
  left: Position,
  frontLeft: Position,
}

type BodyPart = {
  size: number;
  position: Position & {
    direction: number,
    cardinal: CardinalPositions
  };
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
      if(old === undefined) return {x: window.innerWidth / 2, y: 0, direction: Math.PI *1.5, cardinal: cardinalPositions({x: window.innerWidth / 2, y: 0}, Math.PI * 1.5, d.size)}
      const i = body().indexOf(this)
      const next = untrack(() => body()[i + 1]?.position)
      const prev = body.peek()[i - 1]?.position
      const distance = i == 0 ? undefined : Math.sqrt((prev.x - old.x) ** 2 + (prev.y - old.y) ** 2)
      const angle = i == 0 ? Math.atan2(old.y - next.y, old.x - next.x) : Math.atan2(prev.y - old.y, prev.x - old.x)
      const pos = i == -1
        ? {x: window.innerWidth / 2, y: 0}
        : i == 0
          ? position()
          : distance == dotDistance ? old : {x: prev.x - Math.cos(angle) * dotDistance, y: prev.y - Math.sin(angle) * dotDistance}

      return {
        x: pos.x,
        y: pos.y,
        direction: angle * 180 / Math.PI,
        cardinal: cardinalPositions(pos, angle * 180 / Math.PI, d.size)
      }
    }
  }) as Storable<BodyPart>))
  let head: HTMLDivElement | null = null;

  function cardinalPositions(position: Position, angle: number, size: number){
    const angs = {front: 0, frontRight: 45, right: 90, backRight: 135, back: 180, backLeft: 225, left: 270, frontLeft: 315}
    return Object.fromEntries(Object.entries(angs).map(([key, ang]) => {
      const rad = (angle + ang) * Math.PI / 180
      return [key, {x: position.x + Math.cos(rad) * size, y: position.y + Math.sin(rad) * size}]
    })) as CardinalPositions
  }

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


  const bodySvgPath = computed(() => {
    if(body().length < 2) return ""
    // start with frontRight front and frontleft of head
    const head = body()[0].position
    const headSize = body()[0].size
    let path = `M ${head.cardinal.right.x} ${head.cardinal.right.y} `
    path += `A ${headSize} ${headSize} 0 0 0 ${head.cardinal.frontRight.x} ${head.cardinal.frontRight.y} `
    path += `A ${headSize} ${headSize} 0 0 0 ${head.cardinal.front.x} ${head.cardinal.front.y} `
    path += `A ${headSize} ${headSize} 0 0 0 ${head.cardinal.frontLeft.x} ${head.cardinal.frontLeft.y} `
    path += `A ${headSize} ${headSize} 0 0 0 ${head.cardinal.left.x} ${head.cardinal.left.y} `
    // follow with lefts
    for(let i = 1; i < body().length; i++) path += `L ${body()[i].position.cardinal.left.x} ${body()[i].position.cardinal.left.y} `
    // follow with back
    const back = body()[body().length - 1].position
    const tailSize = body()[body().length - 1].size
    path += `A ${tailSize} ${tailSize} 0 0 0 ${back.cardinal.backLeft.x} ${back.cardinal.backLeft.y} `
    path += `A ${tailSize} ${tailSize} 0 0 0 ${back.cardinal.back.x} ${back.cardinal.back.y} `
    path += `A ${tailSize} ${tailSize} 0 0 0 ${back.cardinal.backRight.x} ${back.cardinal.backRight.y} `
    path += `A ${tailSize} ${tailSize} 0 0 0 ${back.cardinal.right.x} ${back.cardinal.right.y} `
    // follow with rights
    for(let i = body().length - 2; i >= 0; i--) path += `L ${body()[i].position.cardinal.right.x} ${body()[i].position.cardinal.right.y} `
    path += `L ${head.cardinal.frontRight.x} ${head.cardinal.frontRight.y} `
    return path
  })

  return <>
    <div
      style={{height: "100%", position: "relative", "z-index": 1}}
      onMouseMove={(e) => { if (e.buttons == 1) move(e.clientX, e.clientY) }}
    >
      <svg
        style={{position: "absolute", top: 0, left: 0}}
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        width={window.innerWidth}
        height={window.innerHeight}
      >
        <path d={bodySvgPath()} fill={color} />
      </svg>
    </div>
  </>
}