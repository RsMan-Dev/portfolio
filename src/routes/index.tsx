import {useNavigate} from "@solidjs/router";

export default function Home() {
  return useNavigate()("/home");
}
