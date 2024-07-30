import {createSolidElement} from "../utils/createSolidElement";
import {createEffect, createSignal, onCleanup} from "solid-js";
import {ICustomElement} from "component-register";

declare global {
  interface HTMLElementTagNameMap {
    "time-input": ICustomElement;
  }
}

const el = createSolidElement(
  {
    name: "",
    value: {attribute: "value", value: null as number | null, parse: true, reflect: true, notify: true},
    hours: {attribute: "hours", value: true, parse: true, reflect: true, notify: true},
    minutes: {attribute: "minutes", value: true, parse: true, reflect: true, notify: true},
    seconds: {attribute: "seconds", value: false, parse: true, reflect: true, notify: true}
  }
)((p, {element}) => {
  let wasInit = false;
  createEffect(() => {
    if(!p.minutes && p.hours && p.seconds) element.minutes = true;
    if(!p.hours && !p.minutes && !p.seconds) element.seconds = true;
  })
  const refs = {
    hours: undefined as HTMLInputElement | undefined,
    minutes: undefined as HTMLInputElement | undefined,
    seconds: undefined as HTMLInputElement | undefined
  }
  const [inputStrs, setInputStrs] = createSignal(valueToStrs(), {equals: false});

  createEffect(() => { if(Number.isNaN(p.value)) element.value = null; })
  createEffect(() => { element.setAttribute("name", p.name); })
  createEffect(() => {
    const vs = values();
    for(const key of Object.keys(refs) as (keyof typeof refs)[])
      if((refs[key]?.value == "" ? undefined : parseInt(refs[key]?.value ?? "0")) !== vs[key]) {
        // we want to avoid updating it every time, only when values when converted to number are different from visible text
        setInputStrs(valueToStrs())
        break;
      }
  })
  createEffect(() => {
    const s = inputStrs()
    if(refs["hours"] && s["hours"]) refs["hours"].value = s["hours"];
    if(refs["minutes"] && s["minutes"]) refs["minutes"].value = s["minutes"];
    if(refs["seconds"] && s["seconds"]) refs["seconds"].value = s["seconds"];
    wasInit = true;
  })

  function padInt(n?: number, width?: number) {
    if(n === undefined || Number.isNaN(n)) return "";
    let str = (n ?? "0").toString();
    while (str.length < (width ?? 0)) str = "0" + str;
    return str;
  }

  function valueToStrs() {
    return Object.entries(values()).reduce(
      (acc, [k, v]) =>
        ({...acc, [k]: padInt(v, 2)}),
      {} as {hours: string, minutes: string, seconds: string}
    )
  }

  function values(): {hours?: number, minutes?: number, seconds?: number} {
    let value = p.value ?? 0;
    if(Number.isNaN(value)) value = 0;
    const setToZero = p.value != null && !Number.isNaN(p.value);
    const values: any = {};
    if(p.hours) {
      const nx= Math.floor(value / 3600)
      values.hours = (!refs["hours"] || refs["hours"]?.value == "") && nx == 0 ? undefined : nx;
      if(!wasInit && setToZero && !values.hours) values.hours = 0;
      value -= (values.hours ?? 0) * 3600;
    }
    if(p.minutes) {
      const nx = Math.floor(value / 60);
      values.minutes = (!refs["minutes"] || refs["minutes"]?.value == "") && nx == 0 ? undefined : nx;
      if(!wasInit && setToZero && !values.minutes) values.minutes = 0;
      value -= (values.minutes ?? 0) * 60;
    }
    if(p.seconds) {
      values.seconds = (!refs["seconds"] || refs["seconds"]?.value == "") && value == 0 ? undefined : value;
      if(!wasInit && setToZero && !values.seconds) values.seconds = 0;
    }
    return values;
  }

  function changeValue(ev: KeyboardEvent, key: keyof ReturnType<typeof values>, value: string | null) {
    let parsed= !value || value == "" ? undefined : parseInt(value);
    const v = values();
    if(!parsed) v[key] = parsed
    else {
      if(key == "seconds" && p.minutes && parsed > 59) parsed = 59;
      if(key == "minutes" && p.hours && parsed > 59) parsed = 59;
      if(parsed < 0) parsed = 0;
      v[key] = parsed;
    }
    const secs = v.hours == undefined && v.minutes == undefined && v.seconds == undefined ?
      null:
      (v.hours ?? 0) * 3600 + (v.minutes ?? 0) * 60 + (v.seconds ?? 0);
    element.value = secs;
  }

  function keyPress(ev: KeyboardEvent, key: keyof ReturnType<typeof values>) {
    switch (ev.key) {
      case "ArrowUp":
        ev.preventDefault();
        changeValue(ev, key, ((values()[key] ?? 0) + 1).toString());
        setInputStrs(valueToStrs());
        break;
      case "ArrowDown":
        ev.preventDefault();
        changeValue(ev, key, ((values()[key] ?? 0) - 1).toString());
        setInputStrs(valueToStrs());
        break;
      case "Tab":
        ev.preventDefault();
        const nextKey = ev.shiftKey ?
          (key == "hours" ? null : key == "minutes" ? "hours" : "minutes") :
          (key == "hours" ? "minutes" : key == "minutes" ? "seconds" : null);
        if(!nextKey) return;
        const nextEl = refs[nextKey];
        if(nextEl) (nextEl as HTMLElement).focus();
        break;
      default:
        changeValue(ev, key, (ev.currentTarget as HTMLInputElement).value);
        break;
    }
  }

  function spanAttrsFor(key: keyof ReturnType<typeof values>) {
    return {
      onkeyup: (e: KeyboardEvent) => keyPress(e, key),
      onkeypress: (e: KeyboardEvent) => {
        if(e.key == "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      },
      onblur: () => {
        setInputStrs(valueToStrs())
      },
      class: p[key] ? "" : "hidden",
      pseudo: "value-data"
    }
  }

  function onClickOutside(e: MouseEvent) {
    if(e.target && !(
      (element as any as Element) == e.target ||
      element.contains(e.target) ||
      !element.renderRoot.contains(e.target as Node)
    )) return;
    const el = (element.renderRoot as ShadowRoot).activeElement;
    if(el && "blur" in el) (el as HTMLElement).blur();
  }

  document.addEventListener("click", onClickOutside);
  onCleanup(() => document.removeEventListener("click", onClickOutside));

  element.onclick = () => {
    if((element.renderRoot as ShadowRoot).activeElement?.closest("input:not(.hidden)")) return;
    const el = element.renderRoot.querySelector("input:not(.hidden)") as HTMLElement;
    if(el) el.focus();
  }

  Object.defineProperty(element, "type", { get() { return element.localName;} });
  Object.defineProperty(element, "form", { get() { return element.internals_.form; } });
  Object.defineProperty(element, "validity", { get() { return element.internals_.validity; } });
  Object.defineProperty(element, "willValidate", { get() { return element.internals_.willValidate; } });
  Object.defineProperty(element, "validationMessage", { get() { return element.internals_.validationMessage; } });
  Object.defineProperty(element, "checkValidity", { value: () => element.internals_.checkValidity() });
  Object.defineProperty(element, "reportValidity", { value: () => element.internals_.reportValidity() });

  element.internals_ = element.attachInternals();

  createEffect(() => {
    element.internals_.setFormValue(p.value?.toString() || "");
  })

  return <div>
    <style>
      {`
        input {
          display: inline-block;
          padding: 0px 4px;
          text-align: center;
          margin: 0 2px;
          border-radius: 3px;
          border: none;
          width: 4ch;
          appearance: none;
          -moz-appearance: textfield;
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input.hidden {
          display: none;
        }
        input:focus{
          outline: 1px solid black;
        }
        div{
          display: flex;
        }
      `}
    </style>
    <input ref={refs.hours} type="number" {...spanAttrsFor("hours")} placeholder={"--"} min={0}/>
    {p.hours && p.minutes ? ":" : ""}
    <input ref={refs.minutes} type="number" {...spanAttrsFor("minutes")} placeholder={"--"} min={0} max={59}/>
    {p.minutes && p.seconds ? ":" : ""}
    <input ref={refs.seconds} type="number" {...spanAttrsFor("seconds")} placeholder={"--"} min={0} max={59}/>
  </div>
})

function replaceInput(node: HTMLInputElement) {
  const p = node.closest<HTMLElement>("[data-controller='number-field']")
  if(p) p.dataset.controller = "";
  const el = document.createElement("time-input");
  el.value = parseInt(node.value);
  el.setAttribute("name", node.name);
  if(node.dataset.hours) el.hours = node.dataset.hours == "true";
  if(node.dataset.minutes) el.minutes = node.dataset.minutes == "true";
  if(node.dataset.seconds) el.seconds = node.dataset.seconds == "true";
  node.replaceWith(el as any as Element);
}

// observe document, all input elements with class time-input will be replaced with time-input element
new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if(node instanceof HTMLElement){
        if(node instanceof HTMLInputElement && node.classList.contains("time-input")) {
          replaceInput(node);
          return
        }
        const el = node.querySelectorAll<HTMLInputElement>("input.time-input");
        if(el) el.forEach(replaceInput);
      }
    })
  })
}).observe(document, {childList: true, subtree: true});

document.addEventListener("turbo:load", () => {
  document.querySelectorAll<HTMLInputElement>("input.time-input").forEach(replaceInput);
})

export default class TimeInput extends el {
  static formAssociated = true;
};