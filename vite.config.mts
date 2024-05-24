import {defineConfig, PluginOption} from 'vite'
import Rails from 'vite-plugin-rails'
import vite_ssr_bundle from "vite-bundle-solid-ssr";
import solidPlugin from "vite-plugin-solid";
import cssnano from 'cssnano'
import tailwindcss from 'tailwindcss'
import tailwindcssNested from 'tailwindcss/nesting'
import autoprefixer from 'autoprefixer'
import postcssRenameCustomProperties from "postcss-rename-custom-properties";
/*
 * Optimization: will remove sourcemaps and rename custom properties to minimize their size
 */
const force_optimization = true
const optimize = process.env.NODE_ENV === 'production' || force_optimization

// PostCSS plugins
const postcss_plugins = [
  cssnano({
    preset: 'default',
  }),
  tailwindcssNested,
  tailwindcss,
  autoprefixer,
]

// will add my custom postcss plugin to rename custom properties, from --tw-translate-x, --tw-translate-y, ... to --a, --b, ...
// wh save a lot of space in the css file with tailwind that uses a lot of custom properties
if (optimize) postcss_plugins.push(postcssRenameCustomProperties({
  safelist: ["--bar-size", "--bar-pos", "--timeout"]
}) as any)

export default defineConfig({
  // define the mode, development or production, will pick it from the environment variable NODE_ENV
  mode: process.env.RAILS_ENV ?? process.env.NODE_ENV ?? "development",
  css: {
    // css => no sourcemap, css file will be minified if optimize is true
    devSourcemap: !optimize,
    postcss: {
      map: !optimize ? {inline: false, prev: true} : false,
      plugins: postcss_plugins,
    }
  },
  build: {
    // js => no sourcemap, js file will be minified if optimize is true, will inline small assets
    lib: false,
    assetsInlineLimit: 4096,
    sourcemap: !optimize,
    minify: optimize,
    cssMinify: optimize,
  },
  plugins: [
    Rails({
      // define the environment variable RAILS_ENV, will pick it from the environment variable RAILS_ENV
      envVars: { RAILS_ENV: process.env.RAILS_ENV ?? "development" },
      // define the reload strategy, will reload the page if the file is in the globs provided
      fullReload: {
        additionalPaths: ["config/locales/**/*.yml", "app/assets/javascripts/custom_els/**/*.{jxs,tsx,js,ts}"],
      },
      // force brotli compression, disable gzip compression, to have the best compression
      compress: {
        gzip: false,
        brotli: true,
      },
    }),
    // will bundle the server side rendering code, from app/assets/javascripts/server.ts to app/assets/builds/server.js
    // will include all components from app/assets/javascripts/components/ into the input file
    // before the bundle, will run the solid plugin, to compile the solid components, using serverside solid bundle
    vite_ssr_bundle(
      `app/assets/javascripts/server.ts`,
      `app/assets/builds/server.js`,
      `app/assets/javascripts/components/`,
    ) as PluginOption,
    // will run the solid plugin, to compile the solid components, using clientside solid bundle
    // enable hot in development mode, code will not be hydratable, will generate dom code
    solidPlugin({
      dev: !optimize,
      hot: true,
      solid: {
        hydratable: false,
        generate: 'dom',
        omitNestedClosingTags: false,
      }
    }),
  ],
})
