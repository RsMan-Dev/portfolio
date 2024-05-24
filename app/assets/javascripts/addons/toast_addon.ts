import {flash} from "../components/Toast";

declare global {
  interface Window {
    flash: typeof flash
  }
}

window.flash = flash