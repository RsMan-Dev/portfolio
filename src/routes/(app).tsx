import {ParentComponent} from "solid-js";

const AppLayout: ParentComponent = (props) => (
  <>
    <nav>
      <sticky-el class="rounded-2xl"><a href={"/home#whoami"}>About me</a></sticky-el>
      <sticky-el class="rounded-2xl"><a href={"/home#projects"}>My Projects</a></sticky-el>
    </nav>
    {props.children}
  </>
)

export default AppLayout