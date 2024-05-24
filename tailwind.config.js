
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
  }
}
