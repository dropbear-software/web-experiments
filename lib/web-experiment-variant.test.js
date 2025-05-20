import { expect } from '@esm-bundle/chai';
import './web-experiment-variant.js'; // Import the component to register it

describe('WebExperimentVariant', () => {
  let element;

  beforeEach(async () => {
    element = document.createElement('web-experiment-variant');
    document.body.appendChild(element);
    // Wait for component to be fully initialized if necessary (e.g., connectedCallback)
    // For this component, connectedCallback primarily ensures it's hidden, which is testable.
    await Promise.resolve(); // Simple tick for updates
  });

  afterEach(() => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  it('should be hidden by default after connectedCallback', () => {
    // connectedCallback explicitly calls hide(), which sets this.hidden = true
    expect(element.hidden).to.be.true;
  });

  it('should reflect variant-id attribute in variantId property', () => {
    expect(element.variantId).to.equal(''); // Default if attribute not set
    element.setAttribute('variant-id', 'test-variant');
    expect(element.variantId).to.equal('test-variant');
  });

  it('should parse weight attribute correctly', () => {
    expect(element.weight).to.equal(0); // Default if attribute not set or invalid

    element.setAttribute('weight', '50');
    expect(element.weight).to.equal(50);

    element.setAttribute('weight', '0');
    expect(element.weight).to.equal(0);

    element.setAttribute('weight', 'invalid');
    expect(element.weight).to.equal(0); // Default for invalid

    element.setAttribute('weight', '-10');
    expect(element.weight).to.equal(0); // Default for negative

    element.setAttribute('weight', '3.14');
    expect(element.weight).to.equal(3.14);
  });

  it('show() method should make the element visible', () => {
    element.show();
    expect(element.hidden).to.be.false;
  });

  it('hide() method should make the element hidden', () => {
    element.hidden = false; // Make it visible first
    element.hide();
    expect(element.hidden).to.be.true;
  });

  it('connectedCallback should ensure element is hidden even if initially unhidden', async () => {
    // Test scenario where element might be added to DOM already unhidden
    const newElement = document.createElement('web-experiment-variant');
    newElement.hidden = false;
    document.body.appendChild(newElement);
    await Promise.resolve(); // Allow connectedCallback to run
    expect(newElement.hidden).to.be.true;
    if (newElement.parentNode) {
      newElement.parentNode.removeChild(newElement);
    }
  });
});
