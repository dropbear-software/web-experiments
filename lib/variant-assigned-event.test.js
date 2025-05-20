import { expect } from '@esm-bundle/chai';
import { VariantAssignedEvent } from './variant-assigned-event.js';

describe('VariantAssignedEvent', () => {
  const experimentId = 'test-exp-123';
  const variantId = 'variant-abc';
  const trigger = 'select';

  it('should correctly initialize properties from constructor', () => {
    const event = new VariantAssignedEvent(experimentId, variantId, trigger);

    expect(event.experimentId).to.equal(experimentId);
    expect(event.variantId).to.equal(variantId);
    expect(event.trigger).to.equal(trigger);
  });

  it('should have the correct event type', () => {
    const event = new VariantAssignedEvent(experimentId, variantId, trigger);
    expect(event.type).to.equal(VariantAssignedEvent.EVENT_TYPE);
  });

  it('should bubble and be composed', () => {
    const event = new VariantAssignedEvent(experimentId, variantId, trigger);
    expect(event.bubbles).to.be.true;
    expect(event.composed).to.be.true;
  });

  it('should allow different trigger types', () => {
    const eventLoad = new VariantAssignedEvent(experimentId, variantId, 'load');
    expect(eventLoad.trigger).to.equal('load');

    const eventPreSelected = new VariantAssignedEvent(experimentId, variantId, 'pre-selected');
    expect(eventPreSelected.trigger).to.equal('pre-selected');
  });
});
