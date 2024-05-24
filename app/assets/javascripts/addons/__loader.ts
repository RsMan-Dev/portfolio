const addons: Record<string, any> = import.meta.glob('./**/*_addon.{js,ts,tsx}', {eager: true})

/**
 * Load all addons in the current function's file directory, all files named "*_addon.js" or "*_addon.ts" will be
 * loaded and their init function will be called if it exists
 * Addons are used for all-context required js code, like global functions, monkey patches, etc
 */
export default function loadAddons(){
  const addonNames = Object.keys(addons).map(path => path.replace('./', '').replace(/_addon\.(js|ts)/, ''))
  for (const path in addons) {
    const addonName = path.replace('./', '').replace(/_addon\.(js|ts)/, '')
    if (addons[path] && "dependencies" in addons[path]) {
      if (!addons[path].dependencies.every((dep: string) => addonNames.includes(dep))) {
        console.error(`Addon "${addonName}" has missing dependencies:`, addons[path].dependencies)
        continue
      }
    }
    if (addons[path] && "init" in addons[path]) addons[path].init.call(null)
    if(window.debug) console.log(`Loaded addon "${addonName}":`, addons[path])
  }
}