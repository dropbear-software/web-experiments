/**
 * Manages persistence (getting/setting) of assigned A/B test variants
 * for a specific experiment, using either cookies or local storage.
 * Handles key generation, reading/writing, and cookie configuration.
 */
export class StorageHandler {
  /**
   * Key prefix for storage to avoid collisions.
   * @private
   * @readonly
   */
  static #STORAGE_PREFIX = 'web_experiment_';

  /**
   * Default cookie expiry in days.
   * @private
   * @readonly
   */
  static #DEFAULT_COOKIE_EXPIRY_DAYS = 365;

  /**
   * @private
   * @type {'cookie' | 'local'}
   * @readonly
   */
  #storageType;

  /**
   * @private
   * @type {string}
   * @readonly
   */
  #experimentId;

  /**
   * @private
   * @type {string}
   * @readonly
   */
  #storageKey;

  /**
   * Creates an instance of StorageHandler.
   * @param {'cookie' | 'local'} storageType - The type of storage to use ('cookie' or 'local').
   * @param {string} experimentId - The unique ID for the experiment.
   * @throws {Error} if experimentId is not provided.
   */
  constructor(storageType = 'cookie', experimentId) {
    if (!experimentId) {
      throw new Error('StorageHandler requires an experimentId.');
    }
    // Ensure storageType is valid, default to 'cookie' otherwise
    this.#storageType = (storageType === 'local') ? 'local' : 'cookie';
    this.#experimentId = experimentId;
    this.#storageKey = `${StorageHandler.#STORAGE_PREFIX}${this.#experimentId}`;
    // console.log(`StorageHandler initialized for '${experimentId}' using ${this.#storageType} storage. Key: ${this.#storageKey}`);
  }

  /**
   * Retrieves the assigned variant ID from the chosen storage.
   * Handles potential storage access errors gracefully.
   * @returns {string | null} The variant ID if found, otherwise null.
   */
  getAssignedVariant() {
    let variantId = null;
    try {
      if (this.#storageType === 'local') {
        variantId = localStorage.getItem(this.#storageKey);
      } else {
        const cookies = document.cookie.split('; ');
        const cookie = cookies.find(row => row.startsWith(`${this.#storageKey}=`));
        if (cookie) {
          variantId = decodeURIComponent(cookie.split('=')[1]); // Ensure decoding
        }
      }
    } catch (e) {
      console.error(`WebExperiment: Error reading from ${this.#storageType} storage.`, e);
    }
    // console.log(`StorageHandler get: ${this.#storageKey} -> ${variantId}`);
    return variantId;
  }

  /**
   * Stores the assigned variant ID in the chosen storage.
   * Handles potential storage access errors gracefully.
   * Sets appropriate cookie attributes (expiry, path, SameSite).
   * @param {string} variantId - The variant ID to store. Does nothing if variantId is null or empty.
   */
  setAssignedVariant(variantId) {
    // console.log(`StorageHandler set: ${this.#storageKey} = ${variantId}`);
    // Don't store null/empty values explicitly
    if (!variantId) return;

    try {
      // Ensure encoding for cookies
      const encodedVariantId = encodeURIComponent(variantId);
      if (this.#storageType === 'local') {
        // LocalStorage handles encoding implicitly
        localStorage.setItem(this.#storageKey, variantId);
      } else {
        const expires = new Date();
        expires.setTime(expires.getTime() + (StorageHandler.#DEFAULT_COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
        // Setting SameSite=Lax by default for good practice, Secure might be needed depending on context
        // Path=/ ensures cookie is available across the whole site
        document.cookie = `${this.#storageKey}=${encodedVariantId};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
      }
    } catch (e) {
      console.error(`WebExperiment: Error writing to ${this.#storageType} storage.`, e);
    }
  }

  /**
   * Clears the assigned variant from the chosen storage type.
   * Handles potential storage access errors gracefully.
   */
  clearAssignedVariant() {
    // console.log(`StorageHandler clear: ${this.#storageKey}`);
    try {
      if (this.#storageType === 'local') {
        localStorage.removeItem(this.#storageKey);
      } else {
        // To delete a cookie, set its expiry date to the past
        document.cookie = `${this.#storageKey}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
      }
    } catch (e) {
      console.error(`WebExperiment: Error clearing from ${this.#storageType} storage.`, e);
    }
  }
}
