import * as Turbo from '@hotwired/turbo'
import { Application } from "@hotwired/stimulus"
import { registerControllers } from 'stimulus-vite-helpers'

// declare global variables
declare global{
  export interface Window {
    Stimulus: Application,
    debug: boolean,
  }
}

// define debug state variable
window.debug = ['development', 'test'].includes(import.meta.env.RAILS_ENV)
if(window.debug) console.log(`Vite ⚡️ Rails Start in debug mode`)

//start turbo
// @ts-ignore Poor turbo typing since creator dropped typescript support at v8.0.0
Turbo.start()

// load all addons [ small files that add functionality to the application, not wrapped in any framework ]
const addons = import.meta.glob('./addons/**/*_addon.{js,ts}', {eager: true}) as Record<string, any>
const addonNames = Object.keys(addons).map(path => path.replace('./addons/', '').replace(/_addon\.(js|ts)/, ''))
for (const path in addons){
  const addonName = path.replace('./addons/', '').replace(/_addon\.(js|ts)/, '')
  if(addons[path] && "dependencies" in addons[path]){
    if(!addons[path].dependencies.every((dep: string) => addonNames.includes(dep))){
      console.error(`Addon "${addonName}" has missing dependencies:`, addons[path].dependencies)
      continue
    }
  }
  if(addons[path] && "init" in addons[path]) addons[path].init.call(null)
  console.log(`Loaded addon "${addonName}":`, addons[path])
}

// load all custom elements [ web components ]
const customEls: Record<string, any> = import.meta.glob('./custom_els/**/*.{jsx,tsx,js,ts}', {eager: true})
for (const path in customEls) {
  const customElementName = ((e) => e[e.length-1])(path.replace('./custom_els/', '')
    .replace(/\.(jsx|tsx|js|ts)/, '')
    .replace(/_/g, '-')
    .split("/"))
  if (customEls?.[path].default) {
    customElements.define(customElementName, customEls[path].default)
    if (window.debug) console.log(`Loaded custom element "${customElementName}"`)
  }
}

//Start stimulus application (Must be this scheme to enable hot module reload)
const application= Application.start()
window.Stimulus = application
application.debug = window.debug
const controllers = import.meta.glob('./controllers/**/*_controller.{js,ts}', {eager: true});
registerControllers(application, controllers)