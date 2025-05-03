/**
 * Represents a single variant within a `web-experiment` element.
 * Holds the variant's ID, weight, and its content (light DOM).
 * Provides methods to show/hide the content.
 *
 * @attr {string} variant-id - A unique identifier for this variant within the experiment.
 * @attr {string | number} weight - The relative weight for selecting this variant (non-negative number).
 * @slot - Default slot for the variant's HTML content.
 * @example
 * <!-- Wrap your content like so -->
 * <web-experiment-variant variant-id="variant-a" weight="50">
 *    Variant A content goes here!
 * </web-experiment-variant>
 */
export class WebExperimentVariant extends HTMLElement {
  /**
   * Default weight if the attribute is missing, invalid, or non-positive.
   * @private
   * @readonly
   */
  static #DEFAULT_WEIGHT = 0;

  constructor() {
    super();
    // Variants should start hidden. While CSS is preferred, setting
    // 'hidden' directly ensures it even before CSS potentially loads.
    this.hidden = true;
  }

  /**
   * Lifecycle callback when the element is added to the DOM.
   */
  connectedCallback() {
    // Ensure the element is hidden when connected, reinforcing the constructor.
    // This also handles cases where the element might be dynamically added later.
    this.hide();
  }

  /**
   * Gets the variant ID from the 'variant-id' attribute.
   * @returns {string} The variant ID, or an empty string if the attribute is missing.
   */
  get variantId() {
    return this.getAttribute('variant-id') || '';
  }

  /**
   * Gets the numeric weight from the 'weight' attribute.
   * Parses the attribute value, defaulting to 0 if missing, invalid, or non-positive.
   * @returns {number} The non-negative numeric weight.
   */
  get weight() {
    const weightAttr = this.getAttribute('weight');
    // Attempt to parse the attribute value to a floating-point number.
    const weight = parseFloat(weightAttr);
    // Return the parsed weight if it's a valid positive number, otherwise return the default weight.
    // We allow 0 weight, which means the variant will never be chosen randomly.
    return !isNaN(weight) && weight >= 0 ? weight : WebExperimentVariant.#DEFAULT_WEIGHT;
  }

  /**
   * Makes the variant's content visible by removing the 'hidden' attribute.
   */
  show() {
    this.hidden = false;
    // console.log(`Variant ${this.variantId}: Showing`);
  }

  /**
   * Hides the variant's content by setting the 'hidden' attribute.
   */
  hide() {
    this.hidden = true;
    // console.log(`Variant ${this.variantId}: Hiding`);
  }
}

// Define the custom element if it hasn't been defined yet.
if (!customElements.get('web-experiment-variant')) {
  customElements.define('web-experiment-variant', WebExperimentVariant);
}
