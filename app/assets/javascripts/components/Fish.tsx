import Animal from "./atoms/Animal";
import {store} from "./utils/signal";
import {isServer} from "solid-js/web";

export default function Fish(){
  const size = store({
    width: isServer ? 1920 : window.innerWidth,
    height: isServer ? 1080 : window.innerHeight
  })

  const mousePos = store({x: size.width / 2, y: size.height / 2, auto: false});

  const cameraPos = store({x: 0, y: 0});

  if(!isServer) window.addEventListener("resize", () => {
    size.width = window.innerWidth;
    size.height = window.innerHeight;
  })


  return <>
    <div style={{height: "100%", position: "relative", background: "#062830"}}>
      <div class="absolute top-0 left-0 text-on-primary">
        {cameraPos.x} {cameraPos.y}
      </div>
      <div
        style={{height: "100%", position: "relative", "z-index": 1, overflow: "hidden", "user-select": "none"}}
        onMouseMove={(e) => {
          if(e.buttons != 1) {
            if(!mousePos.auto) {
              mousePos.x = size.width / 2;
              mousePos.y = size.height / 2;
            }
            return;
          }
          mousePos.x = e.clientX;
          mousePos.y = e.clientY;
          mousePos.auto = false;
        }}
        onTouchMove={(e) => {
          if(!e.touches.length) {
            if(!mousePos.auto) {
              mousePos.x = size.width / 2;
              mousePos.y = size.height / 2;
            }
            return;
          }
          mousePos.x = e.touches[0].clientX;
          mousePos.y = e.touches[0].clientY;
          mousePos.auto = false;
        }}
        onMouseLeave={() =>{
          mousePos.x = size.width / 2;
          mousePos.y = size.height / 2;
        }}
        onTouchEnd={() =>{
          mousePos.x = size.width / 2;
          mousePos.y = size.height / 2;
        }}
      >
        <svg
          style={{position: "absolute", top: 0, left: 0}}
          viewBox={`0 0 ${size.width} ${size.height}`}
          {...size}
        >
          <g transform={`translate(${-cameraPos.x + size.width / 2} ${-cameraPos.y + size.height / 2})`}>
            <circle cx={0} cy={0} r={5} fill={"#ff0000"}/>
            <text x={0} y={-size.height / 4} class={"fill-on-primary text-8xl animate-fade-in-slow"}
                  text-anchor={"middle"} alignment-baseline={"center"}>
              William RICHER
            </text>
            <text x={0} y={size.height / 4} class={"fill-on-primary/50 text-3xl animate-fade-in-slow"}
                  text-anchor={"middle"} alignment-baseline={"center"}>
              Voyagez dans le site avec la souris
            </text>
          </g>

          <Animal
            borderColor={"#8eb9c6"}
            color={"#058563"}
            svgSize={size}
            mousePos={mousePos}
            cameraPos={cameraPos}
            margin={Math.min(size.width, size.height) / 3}
            dots={
              [
                {size: 26}, {size: 27}, {size: 27}, {size: 26}, {size: 25},
                {size: 23}, {size: 21}, {size: 18}, {size: 15}, {size: 13},
                {size: 11}, {size: 9}, {size: 7}, {size: 5}, {size: 3.5},
                {size: 2}
              ]
            }
            dotDistance={10}
            adds={[
              {size: 4, atDotIndex: 1, type: "finLeft"},
              {size: 4, atDotIndex: 1, type: "finRight"},
              {size: 7, atDotIndex: 3, type: "finTop"},
              {size: 4, atDotIndex: 15, type: "finBack"},
            ]}
          />

        </svg>
      </div>
    </div>
  </>
}