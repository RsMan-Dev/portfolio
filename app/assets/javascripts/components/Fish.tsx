import Animal from "./atoms/Animal";

export default function Fish(){


  return <>
    <div style={{height: "100%", position: "relative"}}>
      <Animal color={"red"} dots={[{size: 25}, {size: 30}, {size: 28}, {size: 25}, {size: 22}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}, {size: 15}]} dotDistance={10}/>
    </div>
  </>
}