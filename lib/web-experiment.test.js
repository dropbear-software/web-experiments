import { expect } from '@esm-bundle/chai';
import sinon from 'sinon'; // Using sinon for spies and stubs
import { WebExperiment } from './web-experiment.js';
import { WebExperimentVariant } from './web-experiment-variant.js';
import { StorageHandler } from './storage-handler.js';
import { VariantAssignedEvent } from './variant-assigned-event.js';

// Helper to create and append an element, then wait for a tick
async function fixture(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  children.forEach(child => element.appendChild(child));
  document.body.appendChild(element);
  // Wait for component's connectedCallback and initialization (setTimeout(0))
  await new Promise(resolve => setTimeout(resolve, 0));
  return element;
}

// Define custom elements if not already defined
if (!customElements.get('web-experiment')) {
  customElements.define('web-experiment', WebExperiment);
}
if (!customElements.get('web-experiment-variant')) {
  customElements.define('web-experiment-variant', WebExperimentVariant);
}

describe('WebExperiment', () => {
  let experimentElement;
  let variantA, variantB, variantC;
  let storageHandlerStub;
  let consoleErrorSpy, consoleWarnSpy, consoleDebugSpy;

  // Mock StorageHandler methods
  const mockStorageHandler = {
    getAssignedVariant: sinon.stub(),
    setAssignedVariant: sinon.stub(),
    clearAssignedVariant: sinon.stub(),
  };

  beforeEach(async () => {
    // Reset stubs and spies
    mockStorageHandler.getAssignedVariant.reset();
    mockStorageHandler.setAssignedVariant.reset();
    mockStorageHandler.clearAssignedVariant.reset();

    // Spy on console methods
    consoleErrorSpy = sinon.spy(console, 'error');
    consoleWarnSpy = sinon.spy(console, 'warn');
    consoleDebugSpy = sinon.spy(console, 'debug');


    // Stub the StorageHandler constructor to return our mock
    // We need to ensure this stub is active *before* WebExperiment tries to instantiate StorageHandler
    // This is tricky because StorageHandler is imported and potentially used by WebExperiment module directly.
    // A more robust way would be dependency injection into WebExperiment, but for now,
    // we'll rely on the fact that tests run sequentially and we can control the environment.
    // This kind of stubbing is cleaner if StorageHandler is passed in or can be replaced on the instance.
    // For this test, we'll assume WebExperiment creates `new StorageHandler()` and we can't easily intercept that
    // without more complex module-level mocking (e.g. with proxyquire or import maps in test runner).
    //
    // **Alternative for StorageHandler mocking:**
    // Instead of constructor stubbing, we will rely on the fact that `connectedCallback`
    // in `WebExperiment` initializes `this.#storageHandler`. We can temporarily replace
    // the global `StorageHandler` class right before the element is created, and then restore it.
    // This is still a bit hacky. The best solution is if WebExperiment allowed injecting the handler.

    // Create variant elements
    variantA = document.createElement('web-experiment-variant');
    variantA.setAttribute('variant-id', 'A');
    variantA.setAttribute('weight', '50');
    variantA.innerHTML = 'Variant A';

    variantB = document.createElement('web-experiment-variant');
    variantB.setAttribute('variant-id', 'B');
    variantB.setAttribute('weight', '50');
    variantB.innerHTML = 'Variant B';

    variantC = document.createElement('web-experiment-variant'); // For testing no-weight selection
    variantC.setAttribute('variant-id', 'C');
    variantC.setAttribute('weight', '0');
    variantC.innerHTML = 'Variant C';
  });

  afterEach(() => {
    if (experimentElement && experimentElement.parentNode) {
      experimentElement.parentNode.removeChild(experimentElement);
    }
    // Clean up variants if they were added outside the experiment element for some reason
    [variantA, variantB, variantC].forEach(v => {
      if (v && v.parentNode) v.parentNode.removeChild(v);
    });
    // Restore console spies
    console.error.restore();
    console.warn.restore();
    console.debug.restore();

    // Restore Math.random if stubbed
    if (Math.random.isSinonProxy) {
      Math.random.restore();
    }
    // Restore global StorageHandler if it was replaced
    if (StorageHandler.isReplaced) {
        globalThis.StorageHandler = StorageHandler.original;
        delete StorageHandler.isReplaced;
        delete StorageHandler.original;
    }
    // Reset window event listeners or global mocks if any
    delete window.gtag;
    delete window.dataLayer;
    delete window.webExperimentDebugMode;
  });

  // This is a direct replacement of the global, which is generally not ideal
  // but simpler for this specific component structure.
  const replaceGlobalStorageHandler = () => {
    if (!StorageHandler.isReplaced) {
        StorageHandler.original = globalThis.StorageHandler; // Save original
        globalThis.StorageHandler = function() { // Replace global
            return mockStorageHandler;
        };
        StorageHandler.isReplaced = true;
    }
  }

  it('should log an error if experiment-id attribute is missing', async () => {
    experimentElement = document.createElement('web-experiment');
    document.body.appendChild(experimentElement);
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for connectedCallback

    expect(consoleErrorSpy.calledWith('WebExperiment: "experiment-id" attribute is required.', experimentElement)).to.be.true;
  });

  it('should correctly get experimentId from attribute', async () => {
    experimentElement = await fixture('web-experiment', { 'experiment-id': 'test-exp' });
    expect(experimentElement.experimentId).to.equal('test-exp');
  });

  it('should have assignedVariant as null initially', async () => {
    experimentElement = await fixture('web-experiment', { 'experiment-id': 'test-exp' });
    expect(experimentElement.assignedVariant).to.be.null;
  });

  it('debugMode getter should reflect attribute and global flag', async () => {
    experimentElement = await fixture('web-experiment', { 'experiment-id': 'test-debug' });
    expect(experimentElement.debugMode, 'debugMode default').to.be.false;

    experimentElement.setAttribute('debug-mode', '');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(experimentElement.debugMode, 'debugMode attribute').to.be.true;

    experimentElement.removeAttribute('debug-mode');
    window.webExperimentDebugMode = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(experimentElement.debugMode, 'debugMode global flag').to.be.true;
    delete window.webExperimentDebugMode; // Clean up global
  });

  it('googleAnalyticsEnabled getter should reflect gtag attribute', async () => {
    experimentElement = await fixture('web-experiment', { 'experiment-id': 'test-ga' });
    expect(experimentElement.googleAnalyticsEnabled).to.be.false;
    experimentElement.setAttribute('gtag', '');
    expect(experimentElement.googleAnalyticsEnabled).to.be.true;
  });

  it('googleTagManagerEnabled getter should reflect gtm attribute', async () => {
    experimentElement = await fixture('web-experiment', { 'experiment-id': 'test-gtm' });
    expect(experimentElement.googleTagManagerEnabled).to.be.false;
    experimentElement.setAttribute('gtm', '');
    expect(experimentElement.googleTagManagerEnabled).to.be.true;
  });

  describe('Variant Selection', () => {
    beforeEach(() => {
      // Replace global StorageHandler with our mock *before* element creation for these tests
      replaceGlobalStorageHandler();
    });

    it('should use pre-selected variant if "selected" attribute is present', async () => {
      variantB.setAttribute('selected', '');
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'preselect-exp' }, [variantA, variantB]);

      expect(variantA.hidden).to.be.true;
      expect(variantB.hidden).to.be.false;
      expect(experimentElement.assignedVariant).to.equal('B');
      expect(mockStorageHandler.getAssignedVariant.called).to.be.false; // Storage not consulted
      expect(mockStorageHandler.setAssignedVariant.called).to.be.false; // Pre-selected not stored
    });

    it('should warn if multiple variants are pre-selected and use the first one', async () => {
      variantA.setAttribute('selected', '');
      variantB.setAttribute('selected', '');
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'multi-preselect' }, [variantA, variantB]);

      expect(variantA.hidden).to.be.false; // First one
      expect(variantB.hidden).to.be.true;
      expect(experimentElement.assignedVariant).to.equal('A');
      expect(consoleWarnSpy.calledWithMatch(/Multiple variants have the 'selected' attribute/)).to.be.true;
    });

    it('should load variant from storage if available and no pre-selection', async () => {
      mockStorageHandler.getAssignedVariant.returns('B'); // Simulate 'B' in storage
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'load-storage' }, [variantA, variantB]);

      expect(variantA.hidden).to.be.true;
      expect(variantB.hidden).to.be.false;
      expect(experimentElement.assignedVariant).to.equal('B');
      expect(mockStorageHandler.getAssignedVariant.calledOnce).to.be.true;
      expect(mockStorageHandler.setAssignedVariant.called).to.be.false; // Not called if loaded
    });

    it('should clear stale variant from storage and select a new one', async () => {
      mockStorageHandler.getAssignedVariant.returns('X'); // 'X' is not a valid variant
      // For weighted selection, ensure Math.random is predictable
      const mathRandomStub = sinon.stub(Math, 'random').returns(0.1); // Should pick variantA (weight 50)

      experimentElement = await fixture('web-experiment', { 'experiment-id': 'stale-storage' }, [variantA, variantB]);

      expect(mockStorageHandler.getAssignedVariant.calledOnce).to.be.true;
      expect(mockStorageHandler.clearAssignedVariant.calledOnce).to.be.true; // Stale variant cleared
      expect(consoleWarnSpy.calledWithMatch(/Stored variant "X" not found/)).to.be.true;

      // New variant should be selected and stored
      expect(experimentElement.assignedVariant).to.equal('A'); // Based on Math.random stub
      expect(variantA.hidden).to.be.false;
      expect(variantB.hidden).to.be.true;
      expect(mockStorageHandler.setAssignedVariant.calledOnceWith('A')).to.be.true;
      mathRandomStub.restore();
    });

    it('should perform weighted random selection if no pre-selection or storage', async () => {
      mockStorageHandler.getAssignedVariant.returns(null); // Nothing in storage
      const mathRandomStub = sinon.stub(Math, 'random');

      mathRandomStub.returns(0.1); // Should pick variantA (weight 50 out of 100 total)
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'weighted-select' }, [variantA, variantB]);
      await new Promise(resolve => setTimeout(resolve, 0)); // ensure full init

      expect(experimentElement.assignedVariant).to.equal('A');
      expect(variantA.hidden).to.be.false;
      expect(variantB.hidden).to.be.true;
      expect(mockStorageHandler.setAssignedVariant.calledOnceWith('A')).to.be.true;
      mockStorageHandler.setAssignedVariant.resetHistory(); // Reset for next part of test

      // Test selection of variantB
      mathRandomStub.returns(0.6); // Should pick variantB (weight 50, after A's 50)
      // Need to recreate the element to trigger selection again
      if (experimentElement.parentNode) experimentElement.parentNode.removeChild(experimentElement);
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'weighted-select-2' }, [variantA, variantB]);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(experimentElement.assignedVariant).to.equal('B');
      expect(variantA.hidden).to.be.true;
      expect(variantB.hidden).to.be.false;
      expect(mockStorageHandler.setAssignedVariant.calledOnceWith('B')).to.be.true;

      mathRandomStub.restore();
    });

    it('should warn if no variants have positive weight for selection', async () => {
      mockStorageHandler.getAssignedVariant.returns(null);
      const noWeightVariant = document.createElement('web-experiment-variant');
      noWeightVariant.setAttribute('variant-id', 'NW');
      noWeightVariant.setAttribute('weight', '0'); // Zero weight

      experimentElement = await fixture('web-experiment', { 'experiment-id': 'no-weight-exp' }, [noWeightVariant, variantC]); // variantC also has 0 weight
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleWarnSpy.calledWithMatch(/No variants available for weighted selection/)).to.be.true;
      expect(experimentElement.assignedVariant).to.be.null;
      expect(noWeightVariant.hidden).to.be.true; // All should remain hidden
      expect(variantC.hidden).to.be.true;
    });

    it('should warn if no variant children are found', async () => {
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'no-children-exp' });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(consoleWarnSpy.calledWithMatch(/No <web-experiment-variant> children found/)).to.be.true;
      expect(experimentElement.assignedVariant).to.be.null;
    });

    it('should handle case where StorageHandler fails to initialize (no client-side selection)', async () => {
        // To simulate StorageHandler constructor throwing an error:
        if (StorageHandler.isReplaced) { // Restore original if we replaced it
            globalThis.StorageHandler = StorageHandler.original;
            delete StorageHandler.isReplaced;
        }
        const originalActualStorageHandler = globalThis.StorageHandler;
        globalThis.StorageHandler = function() { // Replace global with one that throws
            throw new Error('Simulated StorageHandler Init Fail');
        };
        StorageHandler.isReplaced = true; // Mark it as replaced for cleanup
        StorageHandler.original = originalActualStorageHandler; // Store the actual original

        experimentElement = await fixture('web-experiment', { 'experiment-id': 'storage-fail-exp' }, [variantA]);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(consoleErrorSpy.calledWithMatch(/Failed to initialize StorageHandler/)).to.be.true;
        // If there's no pre-selection, and storage handler fails, no variant should be chosen
        expect(experimentElement.assignedVariant).to.be.null;
        expect(variantA.hidden).to.be.true; // Variant should not be shown

        // No calls to storage methods should occur if handler init failed.
        // Our mockStorageHandler methods won't be called because the actual instance creation failed.
        expect(mockStorageHandler.getAssignedVariant.called).to.be.false;
        expect(mockStorageHandler.setAssignedVariant.called).to.be.false;

        // Restore the original StorageHandler for other tests
        globalThis.StorageHandler = StorageHandler.original;
        delete StorageHandler.isReplaced;
        delete StorageHandler.original;
    });
  });

  describe('Event Dispatching and Analytics', () => {
    beforeEach(() => {
      replaceGlobalStorageHandler(); // Mock storage handler
      mockStorageHandler.getAssignedVariant.returns(null); // Default: no stored variant
       // Default to selecting variant A for event/analytics tests
      sinon.stub(Math, 'random').returns(0.1);
    });

    afterEach(() => {
      if (Math.random.isSinonProxy) Math.random.restore();
    });

    it('should dispatch VariantAssignedEvent when a variant is assigned', async (done) => {
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'event-exp' }, [variantA, variantB]);

      experimentElement.addEventListener(VariantAssignedEvent.EVENT_TYPE, (event) => {
        expect(event).to.be.instanceOf(VariantAssignedEvent);
        expect(event.experimentId).to.equal('event-exp');
        expect(event.variantId).to.equal('A'); // Based on Math.random stub
        expect(event.trigger).to.equal('select'); // Because storage was empty, and no pre-selection
        expect(event.bubbles).to.be.true;
        expect(event.composed).to.be.true;
        done();
      });
    });

    it('should dispatch event with trigger "pre-selected" for server-side selection', async (done) => {
      variantA.setAttribute('selected', '');
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'event-preselect' }, [variantA, variantB]);

      experimentElement.addEventListener(VariantAssignedEvent.EVENT_TYPE, (event) => {
        expect(event.trigger).to.equal('pre-selected');
        expect(event.variantId).to.equal('A');
        done();
      });
    });

    it('should dispatch event with trigger "load" for storage-based selection', async (done) => {
      mockStorageHandler.getAssignedVariant.returns('B'); // Simulate 'B' in storage
      if (Math.random.isSinonProxy) Math.random.restore(); // Don't need random for this

      experimentElement = await fixture('web-experiment', { 'experiment-id': 'event-load' }, [variantA, variantB]);

      experimentElement.addEventListener(VariantAssignedEvent.EVENT_TYPE, (event) => {
        expect(event.trigger).to.equal('load');
        expect(event.variantId).to.equal('B');
        done();
      });
    });

    it('should report to Google Analytics (gtag) if gtag attribute is present', async () => {
      window.gtag = sinon.spy();
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'ga-exp', 'gtag': '' }, [variantA, variantB]);
      await new Promise(resolve => setTimeout(resolve, 0)); // Ensure event dispatch

      expect(window.gtag.calledOnceWith('event', 'experience_impression', {
        'exp_variant_string': 'web-experiment-ga-exp-A' // A is chosen by Math.random stub
      })).to.be.true;
    });

    it('should warn if gtag attribute is present but window.gtag is not found', async () => {
      expect(window.gtag).to.be.undefined; // Ensure it's not defined
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'ga-missing-exp', 'gtag': '' }, [variantA, variantB]);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleWarnSpy.calledWith('WebExperiment: Google Analytics gtag not found.')).to.be.true;
    });

    it('should report to Google Tag Manager (dataLayer) if gtm attribute is present', async () => {
      window.dataLayer = { push: sinon.spy() };
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'gtm-exp', 'gtm': '' }, [variantA, variantB]);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(window.dataLayer.push.calledOnceWith({
        'event': 'experience_impression',
        'exp_variant_string': 'web-experiment-gtm-exp-A'
      })).to.be.true;
    });

     it('should warn if gtm attribute is present but window.dataLayer is not found', async () => {
      expect(window.dataLayer).to.be.undefined;
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'gtm-missing-exp', 'gtm': '' }, [variantA, variantB]);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleWarnSpy.calledWith('WebExperiment: Google Tag Manager data layer not found.')).to.be.true;
    });
  });

  describe('Reconnection', () => {
    beforeEach(() => {
      replaceGlobalStorageHandler();
      mockStorageHandler.getAssignedVariant.returns(null);
      sinon.stub(Math, 'random').returns(0.1); // Select A
    });

    afterEach(() => {
      if (Math.random.isSinonProxy) Math.random.restore();
    });

    it('should not re-initialize or re-select variant if reconnected to DOM', async () => {
      experimentElement = await fixture('web-experiment', { 'experiment-id': 'reconnect-exp', 'debug-mode': '' }, [variantA, variantB]);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(experimentElement.assignedVariant).to.equal('A');
      const initialAssignedId = experimentElement.assignedVariant;

      // Spy on #initializeExperiment. This is a private method, so it's harder to spy on directly.
      // We'll check behaviorally: ensure assigned variant doesn't change and selection logic isn't re-run.
      // We can also check if setAssignedVariant on the mock is called again.
      mockStorageHandler.setAssignedVariant.resetHistory(); // Reset after initial selection
      consoleDebugSpy.resetHistory();

      const parent = experimentElement.parentNode;
      parent.removeChild(experimentElement);
      await Promise.resolve(); // wait for disconnect
      parent.appendChild(experimentElement); // Reconnect
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for connectedCallback

      expect(experimentElement.assignedVariant).to.equal(initialAssignedId); // Should be the same
      // If it re-initialized, setAssignedVariant might be called again if storage was empty
      // and a new selection was made.
      expect(mockStorageHandler.setAssignedVariant.called).to.be.false; // Should not be called again
      expect(consoleDebugSpy.calledWithMatch(/Reconnected, skipping initialization/)).to.be.true;
    });
  });
});
