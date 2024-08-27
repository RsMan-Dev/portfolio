import {computed, CustomStore, signal, Storable, unindexedArrayStore} from "../utils/signal";
import {throttle} from "../../utils/debounce_and_throttle";
import {isServer} from "solid-js/web";
import {batch, createComputed, createEffect, createRenderEffect, onCleanup, untrack} from "solid-js";

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
  displayPos: Position & {
    direction: number,
    cardinal: CardinalPositions
  }
}


interface AnimalProps {
  color: string;
  borderColor: string;
  dots: {size: number}[];
  adds?: {size: number, atDotIndex: number, type: "finLeft" | "finRight" | "finTop" | "finBack" }[];
  dotDistance: number;
  at?: {x: number, y: number};
  robustness?: number;
  svgSize: {width: number, height: number}
  mousePos: {x: number, y: number, auto: boolean}
  margin?: number,
  cameraPos: {x: number, y: number}
}
export default function Animal({color, borderColor, dots, dotDistance, at, adds, robustness = 0.1, svgSize, mousePos, margin = 200, cameraPos}: AnimalProps){
  let disposed = false
  const position = signal(at || {x: svgSize.width / 2, y: margin})
  const body = unindexedArrayStore([] as BodyPart[]);
  const frameTimes = signal([] as number[]);
  const fps = computed(() => 1000 / (frameTimes().reduce((a, b) => a + b, 0) / frameTimes().length))

  const debug = false

  const maxAngle = Math.PI - (robustness * 8.5 * Math.PI)
  let noMoveCountFromAt = 0

  let frameCount = 0
  body(dots.map((d) => ({
    ...d,
    position(this: CustomStore<BodyPart>, old){
      if(old === undefined) return {x: svgSize.width / 2, y: -99999, direction: Math.PI *1.5, cardinal: cardinalPositions({x: svgSize.width / 2, y: 0}, Math.PI * 1.5, d.size, body().length == 0, body().length == dots.length - 1)}
      const i = body().indexOf(this)
      const next = untrack(() => body()[i + 1]?.position)
      const prev = body.peek()[i - 1]?.position
      const distance = i == 0 ? undefined : Math.sqrt((prev.x - old.x) ** 2 + (prev.y - old.y) ** 2)
      let angle = i == 0 ? Math.atan2(old.y - next.y, old.x - next.x) : Math.atan2(prev.y - old.y, prev.x - old.x)

      if(i > 1){
        let angleFromPrevDirection = (prev!.direction * Math.PI / 180 ) - angle

        if(angleFromPrevDirection > Math.PI) angleFromPrevDirection -= Math.PI * 2 // if full circle, we don't want to mirror the angle
        if(angleFromPrevDirection < -Math.PI) angleFromPrevDirection += Math.PI * 2 // if full circle, we don't want to mirror the angle

        if(angleFromPrevDirection > maxAngle){
          angle += angleFromPrevDirection - maxAngle
        }else if(angleFromPrevDirection < -maxAngle){
          angle += angleFromPrevDirection + maxAngle
        }
      }

      const pos = i == -1
          ? {x: window.innerWidth / 2, y: 0}
          : i == 0
              ? position()
              : distance == dotDistance ? old : {x: prev.x - Math.cos(angle) * dotDistance, y: prev.y - Math.sin(angle) * dotDistance}

      return {
        ...pos,
        direction: angle * 180 / Math.PI,
        cardinal: cardinalPositions(pos, angle * 180 / Math.PI, d.size, i == 0, i == dots.length - 1)
      }
    },
    displayPos(this: CustomStore<BodyPart>){
      return {
        x: this.position.x - cameraPos.x, y: this.position.y - cameraPos.y,
        direction: this.position.direction,
        cardinal: Object.fromEntries(Object.entries(this.position.cardinal).map(([key, pos]) => [key, {x: pos.x - cameraPos.x, y: pos.y - cameraPos.y}])) as CardinalPositions
      }
    }
  }) as Storable<BodyPart>))

  function cardinalPositions(position: Position, angle: number, size: number, isFront: boolean, isBack: boolean){
    let angs = {front: 0, frontRight: 45, right: 90, backRight: 135, back: 180, backLeft: 225, left: 270, frontLeft: 315}
    //@ts-ignore
    if(isFront) angs = {front: 0, frontRight: 45, right: 90, frontLeft: 315, left: 270}
    //@ts-ignore
    else if(isBack) angs = {back: 180, backRight: 135, right: 90, backLeft: 225, left: 270}
    //@ts-ignore
    else angs = {right: 90, left: 270}

    return Object.fromEntries(Object.entries(angs).map(([key, ang]) => {
      const rad = (angle + ang) * Math.PI / 180
      return [key, {x: position.x + Math.cos(rad) * size, y: position.y + Math.sin(rad) * size}]
    })) as CardinalPositions
  }

  function lerp(a: number, b: number, t: number){
    return a + (b - a) * t
  }

  function slightlyMoveToTarget(){
    batch(() => {
      frameCount++
      const pos = position.peek()
      const targetX = Math.round(lerp(pos.x, mousePos.x + cameraPos.x, mousePos.auto ? 0.01 : 0.05) * 100) / 100
      const targetY = Math.round(lerp(pos.y, mousePos.y + cameraPos.y, mousePos.auto ? 0.01 : 0.05) * 100) / 100
      if(position.peek().x == targetX && position.peek().y == targetY) return
      position({x: targetX, y: targetY})
    })
  }

  createEffect(() => {
    const pos = position()
    if(pos.x < cameraPos.x + margin) cameraPos.x = pos.x - margin
    if(pos.y < cameraPos.y + margin) cameraPos.y = pos.y - margin
    if(pos.x > cameraPos.x + svgSize.width - margin) cameraPos.x = pos.x - svgSize.width + margin
    if(pos.y > cameraPos.y + svgSize.height - margin) cameraPos.y = pos.y - svgSize.height + margin
  })

  function frame(){
    const pos = position.peek()
    slightlyMoveToTarget()
    if(!(pos.x == position.peek().x && pos.y == position.peek().y)) {
      noMoveCountFromAt = Date.now();
    }
    if(Date.now() - noMoveCountFromAt > 5000) {
      noMoveCountFromAt = Date.now()
      mousePos.x = Math.random() * (svgSize.width - margin * 2) + margin
      mousePos.y = Math.random() * (svgSize.height - margin * 2) + margin
      mousePos.auto = true
    }
  }
  function af(){
    const start = performance.now()
    frame()
    if(disposed) return
    requestAnimationFrame(af)
    frameTimes().push(performance.now() - start)
    if(frameTimes().length > 100) frameTimes().shift()
    frameTimes([...frameTimes()])
  }
  if(!isServer) createEffect(() => {
    untrack(() => {
      requestAnimationFrame(af)
    })
    return () => {
      disposed = true
    }
  })

  onCleanup(() => disposed = true)


  const bodySvgPath = computed(() => {
    if(body().length < 2) return ""
    // start with frontRight front and frontleft of head
    const head = body()[0].displayPos
    const headSize = body()[0].size
    let path = `M ${head.cardinal.right.x} ${head.cardinal.right.y} `
    path += `A ${headSize} ${headSize} 0 0 0 ${Math.round(head.cardinal.frontRight.x)} ${Math.round(head.cardinal.frontRight.y)} `
    path += `A ${headSize} ${headSize} 0 0 0 ${Math.round(head.cardinal.front.x)} ${Math.round(head.cardinal.front.y)} `
    path += `A ${headSize} ${headSize} 0 0 0 ${Math.round(head.cardinal.frontLeft.x)} ${Math.round(head.cardinal.frontLeft.y)} `
    path += `A ${headSize} ${headSize} 0 0 0 ${Math.round(head.cardinal.left.x)} ${Math.round(head.cardinal.left.y)} `
    // follow with lefts
    for(let i = 1; i < body().length; i++) path += `L ${Math.round(body()[i].displayPos.cardinal.left.x)} ${Math.round(body()[i].displayPos.cardinal.left.y)} `
    // follow with back
    const back = body()[body().length - 1].displayPos
    const tailSize = body()[body().length - 1].size
    path += `A ${tailSize} ${tailSize} 0 0 0 ${Math.round(back.cardinal.backLeft.x)} ${Math.round(back.cardinal.backLeft.y)} `
    path += `A ${tailSize} ${tailSize} 0 0 0 ${Math.round(back.cardinal.back.x)} ${Math.round(back.cardinal.back.y)} `
    path += `A ${tailSize} ${tailSize} 0 0 0 ${Math.round(back.cardinal.backRight.x)} ${Math.round(back.cardinal.backRight.y)} `
    path += `A ${tailSize} ${tailSize} 0 0 0 ${Math.round(back.cardinal.right.x)} ${Math.round(back.cardinal.right.y)} `
    // follow with rights
    for(let i = body().length - 2; i >= 0; i--) path += `L ${Math.round(body()[i].displayPos.cardinal.right.x)} ${Math.round(body()[i].displayPos.cardinal.right.y)} `
    return path
  })

  function circlePath(cx:number, cy:number, r:number){
    return 'M '+cx+' '+cy+' m -'+r+', 0 a '+r+','+r+' 0 1,1 '+(r*2)+',0 a '+r+','+r+' 0 1,1 -'+(r*2)+',0';
  }

  const addsSvgPath = computed(() => {
    if(!adds) return ""

    let path = ""
    //top fins
    for(const fin of adds.filter(a => a.type == "finTop")){
      const deltas: {x: number, y: number, direction: number, delta: number}[] = []
      for(let i = 0; i < fin.size; i++){
        const index = fin.atDotIndex + i
        const pos = body()[index].displayPos
        if(i == 0) path += `M ${Math.round(pos.x)} ${Math.round(pos.y)} `
        if(i != 0)path += `L ${Math.round(pos.x)} ${Math.round(pos.y)} `
        let d = body()[index+1].displayPos.direction - pos.direction
        if(d > 180) d -= 360
        if(d < -180) d += 360
        deltas.push({x: pos.x, y: pos.y, direction: pos.direction, delta: d})
      }

      for(let i = deltas.length - 1; i >= 0; i--){
        const delta = deltas[i]
        const d = (deltas.length / 2 - Math.abs(deltas.length / 2 - i)) / (deltas.length / 2) / 2
        const x = delta.x + Math.cos(delta.direction * Math.PI / 180 + Math.PI / 2) * delta.delta
        const y = delta.y + Math.sin(delta.direction * Math.PI / 180 + Math.PI / 2) * delta.delta
        path += `L ${Math.round(x * d + delta.x * (1 - d))} ${Math.round(y * d + delta.y * (1 - d))} `
      }
    }

    //left fins
    for(const fin of adds.filter(a => a.type == "finLeft" || a.type == "finRight")){
      const deltas: {x: number, y: number, direction: number, delta: number}[] = []
      for(let i = 0; i < fin.size; i++){
        const cardinal = fin.type == "finLeft" ? "left" : "right"
        const ii = fin.type == "finLeft" ? i : -i
        const index = fin.atDotIndex + i
        const pos = body()[index].displayPos
        if(i == 0) path += `M ${Math.round(pos.cardinal[cardinal].x)} ${Math.round(pos.cardinal[cardinal].y)} `
        if(i != 0)path += `L ${Math.round(pos.cardinal[cardinal].x)} ${Math.round(pos.cardinal[cardinal].y)} `
        let d = body()[index+1].displayPos.direction - pos.direction
        if(d > 180) d -= 360
        if(d < -180) d += 360
        deltas.push({x: pos.cardinal[cardinal].x, y: pos.cardinal[cardinal].y, direction: pos.direction, delta: d - ii * 15})
      }

      for(let i = deltas.length - 1; i >= 0; i--){
        const delta = deltas[i]
        const d = (i / deltas.length) * ((deltas.length - i) / deltas.length)
        const x = delta.x + Math.cos(delta.direction * Math.PI / 180 + Math.PI/2) * delta.delta
        const y = delta.y + Math.sin(delta.direction * Math.PI / 180 + Math.PI/2) * delta.delta
        path += `L ${Math.round(x * d + delta.x * (1 - d))} ${Math.round(y * d + delta.y * (1 - d))} `
      }
    }

    //back fin
    for(const fin of adds.filter(a => a.type == "finBack")){
      const e = body()[fin.atDotIndex].displayPos
      path += `M ${Math.round(e.cardinal.back.x)} ${Math.round(e.cardinal.back.y)} `
      const next = {x: e.x + Math.cos(e.direction * Math.PI / 180 + Math.PI) * fin.size * dotDistance, y: e.y + Math.sin(e.direction * Math.PI / 180 + Math.PI) * fin.size * dotDistance}
      path += `L ${next.x} ${next.y} `
      let delta = body()[fin.atDotIndex - 1].displayPos.direction - e.direction
      if(delta > 180) delta -= 360
      if(delta < -180) delta += 360
      next.x += Math.cos(e.direction * Math.PI / 180 + Math.PI / 2) * delta
      next.y += Math.sin(e.direction * Math.PI / 180 + Math.PI / 2) * delta
      path += `L ${next.x} ${next.y} `
      path += `L ${Math.round(e.cardinal.back.x)} ${Math.round(e.cardinal.back.y)} `
    }


    //eyes
    path += circlePath(body()[0].displayPos.x + ((body()[0].displayPos.cardinal.frontRight.x - body()[0].displayPos.x) / 1.5), body()[0].displayPos.y + ((body()[0].displayPos.cardinal.frontRight.y - body()[0].displayPos.y) / 1.5), body()[0].size / 8)
    path += circlePath(body()[0].displayPos.x + ((body()[0].displayPos.cardinal.frontLeft.x - body()[0].displayPos.x) / 1.5), body()[0].displayPos.y + ((body()[0].displayPos.cardinal.frontLeft.y - body()[0].displayPos.y) / 1.5), body()[0].size / 8)

    return path
  })

  return <>
    <path
      d={bodySvgPath()}
      fill={color}
      stroke={borderColor}
    />
    <path
      d={addsSvgPath()}
      fill={borderColor}
      stroke={borderColor}
    />


    {debug && <>
      {body().map((b, i) => <>
        <text x={b.position.x} y={b.position.y} fill="red" text-anchor="middle"
              alignment-baseline="central">{i}</text>
        <circle cx={b.position.cardinal.front?.x} cy={b.position.cardinal.front?.y} r={2} fill="white"/>
        <circle cx={b.position.cardinal.frontRight?.x} cy={b.position.cardinal.frontRight?.y} r={2} fill="white"/>
        <circle cx={b.position.cardinal.right.x} cy={b.position.cardinal.right.y} r={2} fill="white"/>
        <circle cx={b.position.cardinal.backRight?.x} cy={b.position.cardinal.backRight?.y} r={2} fill="white"/>
        <circle cx={b.position.cardinal.back?.x} cy={b.position.cardinal.back?.y} r={2} fill="white"/>
        <circle cx={b.position.cardinal.backLeft?.x} cy={b.position.cardinal.backLeft?.y} r={2} fill="white"/>
        <circle cx={b.position.cardinal.left.x} cy={b.position.cardinal.left.y} r={2} fill="white"/>
        <circle cx={b.position.cardinal.frontLeft?.x} cy={b.position.cardinal.frontLeft?.y} r={2} fill="white"/>
      </>)}
    </>}
  </>
}