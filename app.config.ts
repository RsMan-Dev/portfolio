import { defineConfig } from "@solidjs/start/config";
import UnoCSS from 'unocss/postcss'
import {presetWind3} from 'unocss'

export default defineConfig({
  vite: {
    css: {
      postcss: {
        plugins: [
          UnoCSS({
            configOrPath: {
              presets: [
                presetWind3({
                })
              ],
              outputToCssLayers: true,
              content: {
                filesystem: [
                  './src/**/*.tsx',
                ]
              },
              theme: {
                colors: {
                  primary: {
                    DEFAULT: "#6e55df",
                    light: "#c5bfe3"
                  },
                  secondary: {
                    DEFAULT: "#e68546",
                    light: "#edceba",
                  },
                  background: {
                    DEFAULT: "#F5F4F1",
                  },
                }
              }
            },
          })
        ]
      }
    }
  }
});
