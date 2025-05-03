# @dropbear/web-experiment

A native web component designed for running lightweight A/B testing.

## Description

`@dropbear/web-experiment` is a web component that simplifies the process of running A/B tests directly on your website. It leverages custom elements to manage experiment variants and track user assignments.

## Installation

You can install the package using npm:

```bash
npm install @dropbear/web-experiment
```

## Usage

Include the script in your HTML file:

```html
<script type="module" src="node_modules/@dropbear/web-experiment/main.js"></script>
```

Alternatively, consider using a modern approach with Import Maps

```html
<script type="importmap">
  {
    "imports": {
      "@dropbear/web-experiment": "https://ga.jspm.io/npm:@dropbear/web-experiment@0.1.0/main.js"
    }
  }
</script>
<script type="module">
  import "@dropbear/web-experiment";
</script>
```

Now, include the following CSS on the page:

```css
/* Rule 1: Hide the experiment until the web-experiment component has loaded */
web-experiment:not(:defined) {
  display: none;
}

/* Rule 2: Hide all variants within an experiment BY DEFAULT */
web-experiment>web-experiment-variant {
  display: none;
}

/* Rule 3: Define how the CHOSEN variant should display
This rule applies when the script removes the 'hidden' attribute */
web-experiment>web-experiment-variant:not([hidden]) {
  display: block;
  /* Or inline, flex, etc. - match your layout needs */
}

/* Rule 4: (Optional fallback/belt-and-suspenders)
Explicitly ensure elements with 'hidden' attr are hidden */
web-experiment-variant[hidden] {
  display: none !important;
}
```

Finally, use the custom elements in your HTML:

```html
<web-experiment experiment-id="headline-test" data-storage="local">
  <web-experiment-variant variant-id="short-headline" weight="70">
    <h1>Short Headline Example</h1>
  </web-experiment-variant>
  <web-experiment-variant variant-id="long-headline" weight="30">
    <h1>This is my Long Headline Example</h1>
  </web-experiment-variant>
</web-experiment>
```

Set the probabilities for each variant. The sum of probabilities for all variants within an experiment should be 100.

Note that you can also integrate with Google Tag Manager or Google Analytics 4 automatically by just adding the appropriate attribute `gtm` or `ga` to the `<web-experiment>` tag like so:

```html
<!-- Will automatically send the right events to the data layer that GTM expects -->
<web-experiment gtm experiment-id="headline-test" data-storage="local">
  <web-experiment-variant variant-id="short-headline" weight="70">
    <h1>Short Headline Example</h1>
  </web-experiment-variant>
  <web-experiment-variant variant-id="long-headline" weight="30">
    <h1>This is my Long Headline Example</h1>
  </web-experiment-variant>
</web-experiment>
```

## License

MIT
