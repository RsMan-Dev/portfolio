/* @refresh reload */
import {Canvas, MeshProps, useFrame, useThree, BoxGeometryProps} from "solid-three";
import {isServer} from "solid-js/web";
import {createSignal} from "solid-js";
import {signal} from "../utils/signal";

export function Box() {
  let mesh!: Exclude<MeshProps["ref"], Function>;
  const [hovered, setHovered] = createSignal(false);
  const clicked = signal(false);

  useThree((state) => {
    console.log(state.camera)
  })
  useFrame(() => (mesh!.rotation.y += 0.01));

  return (
    <mesh
      ref={mesh}
      onPointerEnter={(e:any) => setHovered(true)}
      onPointerLeave={(e:any) => setHovered(false)}
      onClick={(e:any) => {
        console.log("clicked")
        clicked.val = !clicked.val
      }}
    >
      <boxGeometry
        args={[122, 1, 1] as BoxGeometryProps["args"]}
      />
      <meshStandardMaterial
        color={hovered() ? "blue" : "green"}
        roughness={0.5}
        metalness={0.5}
      />
    </mesh>
  );
}

export default function Main() {
  if(isServer) return (<div>Server side rendering is not supported</div>);
  return <Canvas
    camera={{
      position: [3, 3, 3]
    }}
    gl={{
      antialias: true
    }}
    shadows>
    <ambientLight intensity={Math.PI / 2}/>
    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI}/>
    <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI}/>
    <Box/>
  </Canvas>;
}

