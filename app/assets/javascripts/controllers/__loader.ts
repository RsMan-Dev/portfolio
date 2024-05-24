import {Application} from "@hotwired/stimulus";
import {registerControllers} from "stimulus-vite-helpers";

declare global {
  export interface Window {
    Stimulus: Application,
  }

  // noinspection ES6ConvertVarToLetConst
  var Stimulus: Application
}


/**
 * This function is used to initialize the Stimulus application.
 * It will automatically load all controllers in the current function's file directory, all files named
 * "*_controller.js" or "*_controller.ts" will be loaded and their default export will be registered as a controller
 * using file name as identifier (replacing "_" with "-")
 * all files named "*_lazycontroller.js" or "*_lazycontroller.ts" will be loaded when the controller is used in the DOM
 */
export default function initStimulus(application: Application){

  const controllers = import.meta.glob('./**/*_controller.{js,ts}', { eager: true });

  const lazyControllers = Object.entries(import.meta.glob('./**/*_lazycontroller.{js,ts}'))
    .map(([path, controllerConstructor]) => {
      const identifier = path.split('/').pop()!.replace(/_lazycontroller\.(js|ts)/, '').replaceAll("_", "-")
      return {identifier, controllerConstructor}
    })

  window.Stimulus = application
  application.debug = window.debug

  registerControllers(application, controllers)

  const lazyLoadedControllers: string[] = []
  async function loadLazyForNodes(nodes: NodeListOf<HTMLElement> | HTMLElement[]) {
    for(const node of nodes) {
      if (!node.dataset.controller) continue;
      const cs = node.dataset.controller.split(" ")
      for (const c of cs) {
        if (
          Stimulus.router.modules.some((m) => m.identifier === c)
          || lazyLoadedControllers.includes(c)
        ) continue
        const controllerDef = lazyControllers.find((def) => def.identifier === c)
        if (!controllerDef) continue
        const controllerFetchFn = controllerDef.controllerConstructor as unknown as () => Promise<{ default: any }>
        const {default: Controller} = await controllerFetchFn()
        Stimulus.register(controllerDef.identifier, Controller)
        lazyLoadedControllers.push(c)
      }
    }
  }

  new MutationObserver((muts) => {
    for (const mut of muts) {
      if (mut.addedNodes.length) {
        for (const node of mut.addedNodes) {
          if (node instanceof HTMLElement) {
            if(node.dataset.controller) loadLazyForNodes([node]).then()
            loadLazyForNodes(node.querySelectorAll<HTMLElement>('[data-controller]')).then()
          }
        }
      }
    }
  }).observe(document, {childList: true, subtree: true})
  document.addEventListener("DOMContentLoaded", () => {
    loadLazyForNodes(document.querySelectorAll<HTMLElement>('[data-controller]')).then()
  })
}