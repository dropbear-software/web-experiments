/**
 * Custom event class dispatched by <web-experiment> when a variant is assigned.
 * Extends the native Event class and provides specific properties for the
 * experiment details.
 *
 * Event listeners can access `event.experimentId`, `event.variantId`, and `event.trigger`.
 */
export class VariantAssignedEvent extends Event {
  /**
   * The standard event type string for this event.
   * @public
   * @static
   * @readonly
   * @type {string}
   */
  static EVENT_TYPE = 'web-experiment:variant-assigned';

  /**
   * The unique identifier of the experiment associated with this event.
   * @public
   * @readonly
   * @type {string}
   */
  experimentId;

  /**
   * The unique identifier of the variant that was assigned and displayed.
   * @public
   * @readonly
   * @type {string}
   */
  variantId;

  /**
   * Indicates the mechanism that resulted in this variant assignment.
   * - 'pre-selected': Variant was determined by a `selected` attribute (server-side).
   * - 'load': Variant was determined by loading from client-side storage.
   * - 'select': Variant was determined by client-side weighted random selection.
   * @public
   * @readonly
   * @type {'pre-selected' | 'load' | 'select'}
   */
  trigger;

  /**
   * Creates a new VariantAssignedEvent instance.
   * @param {string} experimentId - The experiment ID.
   * @param {string} variantId - The assigned variant ID.
   * @param {'pre-selected' | 'load' | 'select'} trigger - The trigger mechanism.
   */
  constructor(experimentId, variantId, trigger) {
    // Call the base Event constructor
    // Pass the standard event type and options (bubbles, composed)
    super(VariantAssignedEvent.EVENT_TYPE, {
      bubbles: true,  // Allows the event to bubble up the DOM tree
      composed: true // Allows the event to cross Shadow DOM boundaries
    });

    // Assign the specific details as read-only properties to the instance
    this.experimentId = experimentId;
    this.variantId = variantId;
    this.trigger = trigger;
  }
}
