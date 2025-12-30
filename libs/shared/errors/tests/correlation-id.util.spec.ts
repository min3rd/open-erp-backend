import {
  generateCorrelationId,
  getOrCreateCorrelationId,
} from '../correlation-id.util';

describe('Correlation ID Utilities', () => {
  describe('generateCorrelationId', () => {
    it('should generate a valid UUID v4', () => {
      const id = generateCorrelationId();

      // UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidV4Pattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(id).toMatch(uuidV4Pattern);
    });

    it('should generate unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('getOrCreateCorrelationId', () => {
    it('should extract correlation ID from request headers', () => {
      const expectedId = 'test-correlation-id-123';
      const request = {
        headers: {
          'x-correlation-id': expectedId,
        },
      };

      const id = getOrCreateCorrelationId(request);
      expect(id).toBe(expectedId);
    });

    it('should extract ID from request.id if available', () => {
      const expectedId = 'request-id-456';
      const request = {
        id: expectedId,
        headers: {},
      };

      const id = getOrCreateCorrelationId(request);
      expect(id).toBe(expectedId);
    });

    it('should prioritize header over request.id', () => {
      const headerId = 'header-id';
      const requestId = 'request-id';
      const request = {
        id: requestId,
        headers: {
          'x-correlation-id': headerId,
        },
      };

      const id = getOrCreateCorrelationId(request);
      expect(id).toBe(headerId);
    });

    it('should generate new ID if none found', () => {
      const request = {
        headers: {},
      };

      const id = getOrCreateCorrelationId(request);

      const uuidV4Pattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidV4Pattern);
    });

    it('should generate new ID if request is undefined', () => {
      const id = getOrCreateCorrelationId();

      const uuidV4Pattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidV4Pattern);
    });
  });
});
