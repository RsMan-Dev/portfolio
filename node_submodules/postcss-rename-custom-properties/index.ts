import {PluginCreator} from "postcss";

// Constants
const USABLE_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'.split('');
const CUSTOM_PROPERTY_REGEX = /--[\w-]+/g;
const CUSTOM_PROPERTY_VALUE_REGEX = /var\((--[\w-]+)\s*?,?\s*?/g;

type Duplicates = Map<string, { newName: string, count: number }>;

// We want to generate a random string for a given index, to have a unique name for each custom property.
// 0 -> a | 1 -> b | 20 -> u | 60 -> 8 | 90 -> aD | 126 -> a9 | 200 -> br | ...
function generateNextPropName(currIndex: number) {
  let res = "";
  for (let li = currIndex; li != -1; li = li < USABLE_LETTERS.length - 1 ? -1 : Math.floor(li / USABLE_LETTERS.length) - 1)
    res = USABLE_LETTERS[li % USABLE_LETTERS.length] + res;
  return `--${res}`;
}

// will get the new name for a custom property, or create a new one if it's the first time we see it,
// and keep track of the number of times we saw it
function newPropOrCurrent(prop: string, duplicates: Duplicates): string {
  if (!duplicates.has(prop)) duplicates.set(prop, {newName: generateNextPropName(duplicates.size), count: 0});
  duplicates.get(prop)!.count++;
  return duplicates.get(prop)!.newName;
}

function duplicatesToPotentialEconomyResultStr(duplicates: Duplicates): string {
  if (duplicates.size === 0) return 'No custom properties renamed.';
  let toR = `Potential economy of ${
    [...duplicates.entries()].reduce((acc, [old, {
      newName,
      count
    }]) => acc + (old.length - newName.length) * count, 0) / 1024
  }ko, renamed ${duplicates.size} custom properties: `;
  for (const [old, {newName, count}] of duplicates.entries()) toR += `${old} -> ${newName} (${count}), `;
  return toR.slice(0, -2);
}

const plugin: PluginCreator<any> = (opts: { safeList?: string[] } = {}) => {
  // noinspection JSUnusedGlobalSymbols -> all methods are used by postcss
  return {
    postcssPlugin: 'postcss-rename-custom-properties',

    // ran at the end of the postcss pipeline, after all other plugins to be sure all custom properties are at final state
    OnceExit(css) {
      console.time("Replaced in")
      const duplicates: Duplicates = new Map();
      // safeListed custom properties are not renamed
      if (opts.safeList) opts.safeList.forEach(prop => duplicates.set(prop, {newName: prop, count: 0}));

      // rename custom properties in the css
      css.walkDecls(decl => {
        for (const [_, value] of decl.value.matchAll(CUSTOM_PROPERTY_VALUE_REGEX))
          decl.value = decl.value.replaceAll(`${value}`, `${newPropOrCurrent(value, duplicates)}`);
        if (decl.prop.match(CUSTOM_PROPERTY_REGEX)) decl.prop = newPropOrCurrent(decl.prop, duplicates);
      });

      // report potential economy in octets
      if (process.env.NODE_ENV !== 'production') console.log(duplicatesToPotentialEconomyResultStr(duplicates));
      console.timeEnd("Replaced in")
    }
  };
};
plugin.postcss = true;

export default plugin;