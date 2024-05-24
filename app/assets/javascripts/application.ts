import * as Turbo from '@hotwired/turbo'
import { Application } from "@hotwired/stimulus"
import { registerControllers } from 'stimulus-vite-helpers'
import loadAddons from "./addons/__loader";
import initCustomEls from "./custom_els/__loader";
import initStimulus from "./controllers/__loader";

// declare global variables
declare global{
  export interface Window {
    debug: boolean,
    Turbo: typeof Turbo
  }
}

// define debug state variable
window.debug = ['development', 'test'].includes(import.meta.env.RAILS_ENV)
if(window.debug) console.log(`Vite ⚡️ Rails Start in debug mode`)

//start turbo
// @ts-ignore Poor turbo typing since creator dropped typescript support at v8.0.0
Turbo.start()

loadAddons()

initCustomEls()


//Start stimulus application (Must be this scheme to enable hot module reload)
const application = Application.start()
initStimulus(application)








