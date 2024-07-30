import {defineConfig, PluginOption} from 'vite'
import Rails from 'vite-plugin-rails'
import vite_ssr_bundle from "vite-bundle-solid-ssr";
import solidPlugin from "vite-plugin-solid";
import cssnano from 'cssnano'
import tailwindcss from 'tailwindcss'
import tailwindcssNesting from 'tailwindcss/nesting'
import autoprefixer from 'autoprefixer'
import postcssRenameCustomProperties from "postcss-rename-custom-properties";
import postcssImport from 'postcss-import'

/*
 * Optimization will remove sourcemaps and rename custom properties to minimize their size
 */
const force_optimization = false
const optimize = process.env.NODE_ENV === 'production' || force_optimization

const postcss_plugins = [
  postcssImport(),
  cssnano({
    preset: 'default',
  }),
  tailwindcssNesting,
  tailwindcss,
  autoprefixer,
]

if (optimize) postcss_plugins.push(postcssRenameCustomProperties({
  safeList: [
    "--pos-x", "--pos-y", "--arrow-offset", "--scaling", "--factor", "--bar-size", "--bar-pos", "--timeout",
    "--color-primary", "--color-on-primary", "--color-secondary", "--color-on-secondary", "--color-background",
    "--color-on-background", "--color-surface", "--color-on-surface", "--color-outline", "--color-on-outline",
    "--color-border", "--color-on-border", "--color-info", "--color-error", "--color-hard-warn", "--color-warn",
    "--color-success", "--spacing-4xs", "--spacing-3xs", "--spacing-2xs", "--spacing-xs", "--spacing-sm",
    "--spacing-md", "--spacing-lg", "--spacing-xl", "--spacing-2xl", "--spacing-3xl", "--spacing-sidebar",
    "--radius-sm", "--radius-md", "--font-h1", "--font-h2", "--font-h3", "--font-button", "--font-text",
    "--font-size-h1", "--font-size-h2", "--font-size-h3", "--font-size-button", "--font-size-text",
    "--font-size-text-s", "--font-size-text-xs"
  ]
}) as any)

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
    vite_ssr_bundle(
      "app/assets/javascripts/server.ts",
      "app/assets/builds/server.js",
      "app/assets/javascripts/components/",
    ) as PluginOption,
    solidPlugin({
      dev: true,
      hot: true,
      solid: {
        hydratable: true,
        generate: 'dom',
        omitNestedClosingTags: false,
      }
    }),
  ],
})