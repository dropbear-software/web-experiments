import { expect } from '@esm-bundle/chai';
import { StorageHandler } from './storage-handler.js';

// Helper to mock localStorage
const mockLocalStorage = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
};

// Helper to mock document.cookie
const mockDocumentCookie = () => {
  let cookieStore = {};
  Object.defineProperty(document, 'cookie', {
    configurable: true, // Allow redefinition for cleanup
    get: () => {
      return Object.entries(cookieStore)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    },
    set: (cookieString) => {
      const [nameValue, ...attributes] = cookieString.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value !== undefined) {
        // Check for expiry to simulate deletion
        const isExpired = attributes.some(attr => {
          const [attrName, attrValue] = attr.trim().split('=');
          if (attrName.toLowerCase() === 'expires') {
            try {
              return new Date(attrValue) < new Date('1971-01-01'); // Cookies expiring in the past
            } catch (e) { return false; } // Invalid date format
          }
          return false;
        });
        if (isExpired) {
          delete cookieStore[name.trim()];
        } else {
          cookieStore[name.trim()] = value.trim();
        }
      } else if (name && value === undefined && cookieString.includes('expires=Thu, 01 Jan 1970 00:00:00 GMT')) {
        // Specifically handle deletion pattern 'key=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
        delete cookieStore[name.trim()];
      }
    },
  });
  return cookieStore; // Return the store for direct manipulation in tests if needed
};


describe('StorageHandler', () => {
  const experimentId = 'test-experiment';
  let originalLocalStorage;
  let originalDocumentCookieDescriptor; // Store the original descriptor

  before(() => {
    originalLocalStorage = globalThis.localStorage;
    // Store the descriptor for document.cookie if it exists
    originalDocumentCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
  });

  after(() => {
    // Restore original localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true, writable: true });
    // Restore original document.cookie using its descriptor
    if (originalDocumentCookieDescriptor) {
      Object.defineProperty(document, 'cookie', originalDocumentCookieDescriptor);
    } else {
      // If document.cookie wasn't originally defined, delete the mock
      delete document.cookie;
    }
  });

  let lsMock;
  // No global cookieMock needed here as it's managed by redefining document.cookie

  beforeEach(() => {
    lsMock = mockLocalStorage();
    mockDocumentCookie(); // Redefines document.cookie with a fresh mock store
    Object.defineProperty(globalThis, 'localStorage', { value: lsMock, configurable: true, writable: true });
  });

  afterEach(() => {
    lsMock.clear();
    // Clear all cookies set during a test by re-running mockDocumentCookie
    // or by setting an expired cookie for each known key if the mock was more complex.
    // For this mock, re-calling mockDocumentCookie effectively resets its internal store.
    mockDocumentCookie();
  });

  it('throws an error if experimentId is not provided', () => {
    expect(() => new StorageHandler('cookie', null)).to.throw('StorageHandler requires an experimentId.');
    expect(() => new StorageHandler('local', undefined)).to.throw('StorageHandler requires an experimentId.');
  });

  it('defaults to "cookie" storage if storageType is invalid or not "local"', () => {
    const handlerInvalid = new StorageHandler('invalid-type', experimentId);
    // We test behaviorally: try to set and get, then check which mock was used.
    // This requires knowing the storage key.
    const storageKey = `web_experiment_${experimentId}`;
    handlerInvalid.setAssignedVariant('test');
    expect(document.cookie).to.include(`${storageKey}=test`); // Should use cookie mock

    const handlerUndefined = new StorageHandler(undefined, experimentId);
    handlerUndefined.setAssignedVariant('test2');
    expect(document.cookie).to.include(`${storageKey}=test2`);
  });

  describe('Cookie Storage', () => {
    let handler;

    beforeEach(() => {
      // Ensure a fresh mock for document.cookie before creating StorageHandler instance
      mockDocumentCookie();
      handler = new StorageHandler('cookie', experimentId);
    });

    it('sets and gets a variant', () => {
      handler.setAssignedVariant('variant-A');
      expect(handler.getAssignedVariant()).to.equal('variant-A');
    });

    it('returns null if no variant is set', () => {
      expect(handler.getAssignedVariant()).to.be.null;
    });

    it('clears an assigned variant', () => {
      handler.setAssignedVariant('variant-B');
      expect(handler.getAssignedVariant()).to.equal('variant-B'); // ensure it's set
      handler.clearAssignedVariant();
      expect(handler.getAssignedVariant()).to.be.null;
    });

    it('handles URI encoding for variant IDs in cookies', () => {
      const complexVariantId = 'variant with spaces/slashes?and&symbols';
      handler.setAssignedVariant(complexVariantId);
      expect(handler.getAssignedVariant()).to.equal(complexVariantId);
      const cookieKey = `web_experiment_${experimentId}`;
      expect(document.cookie).to.include(`${cookieKey}=${encodeURIComponent(complexVariantId)}`);
    });

     it('does not store null or empty variantId', () => {
      handler.setAssignedVariant(null);
      expect(handler.getAssignedVariant()).to.be.null;
      expect(document.cookie).to.equal('');

      handler.setAssignedVariant('');
      expect(handler.getAssignedVariant()).to.be.null;
      expect(document.cookie).to.equal('');
    });
  });

  describe('Local Storage', () => {
    let handler;

    beforeEach(() => {
      handler = new StorageHandler('local', experimentId);
    });

    it('sets and gets a variant', () => {
      handler.setAssignedVariant('variant-C');
      expect(handler.getAssignedVariant()).to.equal('variant-C');
      expect(lsMock.getItem(`web_experiment_${experimentId}`)).to.equal('variant-C');
    });

    it('returns null if no variant is set', () => {
      expect(handler.getAssignedVariant()).to.be.null;
    });

    it('clears an assigned variant', () => {
      handler.setAssignedVariant('variant-D');
      expect(handler.getAssignedVariant()).to.equal('variant-D'); // ensure it's set
      handler.clearAssignedVariant();
      expect(handler.getAssignedVariant()).to.be.null;
      expect(lsMock.getItem(`web_experiment_${experimentId}`)).to.be.null;
    });

    it('does not store null or empty variantId', () => {
      const storageKey = `web_experiment_${experimentId}`;
      handler.setAssignedVariant(null);
      expect(handler.getAssignedVariant()).to.be.null;
      expect(lsMock.getItem(storageKey)).to.be.null;

      handler.setAssignedVariant('');
      expect(handler.getAssignedVariant()).to.be.null;
      expect(lsMock.getItem(storageKey)).to.be.null;
    });
  });
});
