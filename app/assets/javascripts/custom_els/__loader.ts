const customEls = Object.entries(import.meta.glob('./**/*.{jsx,tsx,js,ts}'))
  .map(([key, value]: [string, () => Promise<any> ]) =>{
    return {
      name: ((e) => e[e.length-1])(key.split("/"))
        .replace(/\.(jsx|tsx|js|ts)/, '')
        .replace(/_/g, '-'),
      path: key,
      getter: value
    }
  })

/**
 * Will load lazily all custom elements in the current function's file directory, all files named
 * "*.{js,ts,tsx,jsx}" will be loaded and their default export will be registered as a custom element
 * using file name as tag name (replacing "_" with "-")
 */
export default function initCustomEls() {
  // load all custom elements [ web components ]
  const registeringElements = [] as string[]
  function loadCustomEl(name: string){
    if(customElements.get(name)) return
    if(registeringElements.includes(name)) return
    registeringElements.push(name)
    const el = customEls.find(el => el.name === name)
    if(!el) return
    el.getter().then((module) => {
      if(!module.default) return console.error(`Custom element "${name}" has no default export`)
      customElements.define(name, module.default)
      registeringElements.splice(registeringElements.indexOf(name), 1)
    })
  }

  const selector = customEls.map(el => el.name).join(", ")
  if(!selector && window.debug) return console.warn("No custom elements found")
  document.querySelectorAll(selector).forEach((el) => {loadCustomEl(el.tagName.toLowerCase())})
  new MutationObserver((muts) => {
    for (const mut of muts) {
      if (mut.addedNodes.length) {
        for (const node of mut.addedNodes) {
          if (node instanceof HTMLElement) {
            if(node.closest(selector)) loadCustomEl(node.tagName.toLowerCase())
            node.querySelectorAll(selector).forEach((el) => {loadCustomEl(el.tagName.toLowerCase())})
          }
        }
      }
    }
  }).observe(document, {childList: true, subtree: true})
}