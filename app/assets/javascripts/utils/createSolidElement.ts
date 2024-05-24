import {PropsDefinitionInput, RegisterOptions, ComponentType, register, compose} from "component-register";
import {withSolid} from "solid-element";

declare global {
  // noinspection JSUnusedGlobalSymbols -> false positive
  interface CustomElementRegistry{
    upgradedForSolid: boolean
  }
}

if(!customElements.upgradedForSolid) {
  const origDefine = customElements.define
  customElements.define = function(name, constructor, options){
    if(name === "undefined") {
      if(window.debug) console.log("Skipping custom element definition for name 'undefined' as it is a placeholder for createSolidElement. This is not an error.")
      return
    }
    if(!constructor.prototype.Component) return origDefine.call(customElements, name, constructor, options)
    constructor.prototype.registeredTag = name
    return origDefine.call(customElements, name, constructor, options)
  }
  Object.defineProperty(customElements, "upgradedForSolid", {value: true, writable: false, enumerable: false, configurable: false})

  const origGet = customElements.get
  customElements.get = function(name){
    if(name === "undefined") return undefined
    return origGet.call(customElements, name)
  }
}

export function createSolidElement<T>(
  props = {} as PropsDefinitionInput<T>,
  options: RegisterOptions = {}
) {
  return compose(
    register<T>("undefined", props, options),
    withSolid
  ) as (C: ComponentType<T>) =>  typeof HTMLElement & ComponentType<T>
}