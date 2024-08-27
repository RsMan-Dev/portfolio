
const withOpacity = (variableName) => (({opacityValue}) => `rgba(var(${variableName}), ${opacityValue || 1})`)

module.exports = {
  content: [
    './app/helpers/**/*.rb',
    './app/assets/javascripts/**/*.{js,ts,tsx,jsx}',
    './app/views/**/*.{erb,haml,html,slim}',
    './app/components/**/*.{rb,erb,haml,html,slim}',
  ],
  theme: {
    colors: Object.fromEntries(
        [
          ["inherit", "inherit"],
          ["current", "currentColor"],
          ["transparent", "transparent"],
          ...[
            "primary",
            "primary-accent",
            "on-primary",
            "secondary",
            "secondary-accent",
            "on-secondary",
            "background",
            "on-background",
            "surface",
            "on-surface",
            "outline",
            "on-outline",
            "border",
            "on-border",
            "debug",
            "info",
            "error",
            "hard-warn",
            "warn",
            "success",
          ].map(e => [e, withOpacity(`--color-${e}`)])
        ]
    ),

    keyframes: {
      "fade-out": {
        from: {opacity: '1'},
        to: {opacity: '0'},
      },
      "fade-in": {
        from: {opacity: '0'},
        to: {opacity: '1'},
      },
    },
    animation: {
      "fade-in": 'fade-in .2s ease-in-out normal',
      "fade-in-slow": 'fade-in 1s ease-in-out normal',
      "fade-out": 'fade-out .2s ease-in-out normal',
    },
  }
}
