import { defineConfig } from 'vite'
import Rails from 'vite-plugin-rails'
import vite_ssr_bundle from "vite-bundle-solid-ssr";
import solidPlugin from "vite-plugin-solid";
/*
 * Optimization will remove sourcemaps and rename custom properties to minimize their size
 */
const force_optimization = true
const optimize = process.env.NODE_ENV === 'production' || force_optimization

const postcss_plugins = [
  require('cssnano')({
    preset: 'default',
  }),
  require('tailwindcss'),
  require('autoprefixer'),
]

if (optimize) postcss_plugins.push(require('postcss-rename-custom-properties')({
  safelist: ["--bar-size", "--bar-pos", "--timeout"]
}))

export default defineConfig({
  mode: process.env.NODE_ENV ?? "development",
  server:{
    watch:{
      usePolling: true
    }
  },
  css: {
    devSourcemap: !optimize,
    postcss: {
      map: !optimize ? {inline: false, prev: true} : false,
      plugins: postcss_plugins,
    }
  },
  build: {
    lib: false,
    assetsInlineLimit: 4096,
    sourcemap: !optimize,
    minify: optimize,
    cssMinify: optimize,
  },
  plugins: [
    Rails({
      envVars: { RAILS_ENV: process.env.RAILS_ENV ?? "development" },
      fullReload: {
        additionalPaths: ["config/locales/**/*.yml", "app/assets/javascripts/custom_els/**/*.{jxs,tsx,js,ts}"],
      },
      compress: {
        gzip: false,
        brotli: true,
      },
    }),
    // vite_ssr_bundle(
    //   "app/assets/javascripts/server.ts",
    //   "app/assets/builds/server.js",
    //   "app/assets/javascripts/components/",
    // ),
    // solidPlugin({
    //   dev: true,
    //   hot: false,
    //   solid: {
    //     hydratable: true,
    //     generate: 'dom',
    //     omitNestedClosingTags: false,
    //   }
    // }),
    // {
    //   name: "hot",
    //   transform(src, id) {
    //     if(id.endsWith(".tsx") && id.includes("components/")) {
    //       const compName = id.split("/").pop()?.split(".")[0]
    //       return `
    //         if(import.meta.hot)
    //           import.meta.hot.accept((mod) => {
    //             const key = Object.keys(allComponents).find(k => k.includes("${compName}.tsx"))
    //             if(allComponents && key) allComponents[key] = mod
    //             if(allComponents && renderedComponents && renderedComponents["${compName}"])
    //               renderedComponents["${compName}"].map((el) => el.connectedCallback())
    //           })
    //       ` + src
    //     }
    //   }
    // }
  ],
})