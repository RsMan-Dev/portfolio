import {createEffect, createSignal} from "solid-js";
import ReactiveElement from "../custom_els/reactive_element";
import {isServer} from "solid-js/web";

// used in addons/toast_addon.ts to define window.flash, allow to create a flash from javascript
export function flash(
  title: string,
  message: string,
  type?: string,
  timeout?: number,
  align?: "left" | "right"
){
  const toast = document.createElement("reactive-element") as ReactiveElement;
  toast.setAttribute("name", "Toast")
  toast.setAttribute("type", type ?? "success")
  toast.setAttribute("align", align ?? "right")
  toast.setAttribute("props", JSON.stringify({title, message, timeout}))
  document.getElementById("toasts")?.appendChild(toast)
}

interface ToastProps{
  open?: boolean
  title: string
  message: string
  timeout?: number
}

/**
 * Toast component, used to display a message to the user on a corner of the screen, when any event occurs
 * @param {{reactiveElement: ReactiveElement} & ToastProps} props
 * @constructor
 */
export default function Toast({reactiveElement: parent, open: _open = true, title, message, timeout = 5000}: {reactiveElement: ReactiveElement} & ToastProps) {
  const [open, setOpen] = createSignal(_open)
  const [animateOpen, setAnimateOpen] = createSignal(open())
  const [showProgress, setShowProgress] = createSignal(false)

  // when the animation ends, if the toast is open, we assume the toast ended his opening animation, and we set the animateOpen to false
  function onanimationend(){
    if(open()) setAnimateOpen(false)
  }
  // when the transition ends, if the toast is closed, we remove the parent element from the DOM, we assume the toast ended his closing animation
  function ontransitionend(){
    if(!open()) parent.remove()
  }

  // when the open signal changes, we update the parent element attribute
  createEffect(() => {
    if(isServer) return
    if(open()) parent.setAttribute("open", "")
    else parent.removeAttribute("open")
  })
  createEffect(() => {
    if(isServer) return
    if(animateOpen()) parent.setAttribute("animate-open", "")
    else parent.removeAttribute("animate-open")
  })

  // we define default values for the open and animateOpen signals, and we bind
  // the onanimationend and ontransitionend functions to the parent element, and
  // we start the progress bar, and we set a timeout to close the toast
  if(!isServer) {
    parent.onanimationend = onanimationend
    parent.ontransitionend = ontransitionend
    if(open()) parent.setAttribute("open", "")
    else parent.removeAttribute("open")
    if(animateOpen()) parent.setAttribute("animate-open", "")
    else parent.removeAttribute("animate-open")
    setTimeout(() => setShowProgress(true), 50)


    setTimeout(() => {
      setOpen(false);
    }, timeout)
  }

  // rendering logic
  return (
    <>
      <div class={"toast-icon"} onclick={() => setOpen(false)}></div>
      <div class={"toast-content"}>
        <span>{title}</span>
        <p>{message}</p>
      </div>
      <button type="button" class="icon-close" onclick={() => setOpen(false)}></button>
      <div
        class={`progress-dismiss ${showProgress() ? "show" : ""}`}
        style={`--timeout: ${timeout}ms`}
        // we want to stop propagation to avoid this transition end to remove the parent element
        ontransitionend={e => e.stopPropagation()}
      ></div>
    </>
  )
}