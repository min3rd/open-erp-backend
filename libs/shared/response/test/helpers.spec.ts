/**
 * Unit tests for response helper functions
 */

import {
  ok,
  created,
  updated,
  deleted,
  fetched,
  paginated,
  error,
  validationError,
} from '../helpers';
import { ResponseValidator } from './response-validator';

describe('Response Helpers', () => {
  describe('ok()', () => {
    it('should create a valid success response', () => {
      const response = ok({ id: '123', name: 'Test' }, 'Success');

      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.error).toBeNull();
      expect(response.data).toEqual({ id: '123', name: 'Test' });

      const validation = ResponseValidator.validateEnvelope(response);
      expect(validation.valid).toBe(true);
    });

    it('should create response without message', () => {
      const response = ok({ value: 42 });

      expect(response.success).toBe(true);
      expect(response.message).toBeNull();
      expect(response.data).toEqual({ value: 42 });
    });

    it('should include metadata', () => {
      const response = ok({ data: 'test' }, 'Success', { cached: true });

      expect(response.meta).toEqual({ cached: true });
    });
  });

  describe('created()', () => {
    it('should create a valid created response', () => {
      const item = { id: '123', name: 'New Item' };
      const response = created(item, 'Created successfully');

      expect(response.success).toBe(true);
      expect(response.message).toBe('Created successfully');
      expect(response.error).toBeNull();
      expect(response.data).toEqual({
        mode: 'create',
        item,
      });

      const validation = ResponseValidator.validate(response, {
        expectSingleResource: true,
      });
      expect(validation.valid).toBe(true);
    });

    it('should use default message', () => {
      const response = created({ id: '123' });

      expect(response.message).toBe('Resource created successfully');
    });
  });

  describe('updated()', () => {
    it('should create a valid updated response', () => {
      const item = { id: '123', name: 'Updated Item' };
      const response = updated(item, 'Updated successfully');

      expect(response.success).toBe(true);
      expect(response.data.mode).toBe('update');
      expect(response.data.item).toEqual(item);

      const validation = ResponseValidator.validate(response, {
        expectSingleResource: true,
      });
      expect(validation.valid).toBe(true);
    });
  });

  describe('deleted()', () => {
    it('should create a valid deleted response', () => {
      const response = deleted('Deleted successfully');

      expect(response.success).toBe(true);
      expect(response.message).toBe('Deleted successfully');
      expect(response.data.mode).toBe('delete');
      expect(response.data.item).toBeNull();

      const validation = ResponseValidator.validate(response, {
        expectSingleResource: true,
      });
      expect(validation.valid).toBe(true);
    });
  });

  describe('fetched()', () => {
    it('should create a valid fetched response', () => {
      const item = { id: '123', name: 'Item' };
      const response = fetched(item, 'Fetched successfully');

      expect(response.success).toBe(true);
      expect(response.data.mode).toBe('get');
      expect(response.data.item).toEqual(item);

      const validation = ResponseValidator.validate(response, {
        expectSingleResource: true,
      });
      expect(validation.valid).toBe(true);
    });
  });

  describe('paginated()', () => {
    it('should create a valid paginated response', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const response = paginated(items, 1, 10, 2);

      expect(response.success).toBe(true);
      expect(response.data.items).toEqual(items);
      expect(response.data.page).toBe(1);
      expect(response.data.limit).toBe(10);
      expect(response.data.total).toBe(2);
      expect(response.data.totalPages).toBe(1);

      const validation = ResponseValidator.validate(response, {
        expectPaginated: true,
      });
      expect(validation.valid).toBe(true);
    });

    it('should include query and sort options', () => {
      const items = [{ id: '1' }];
      const response = paginated(items, 1, 10, 100, {
        query: { q: 'search term', filters: { status: 'active' } },
        sort: { by: 'createdAt', order: 'desc' },
      });

      expect(response.data.query).toEqual({
        q: 'search term',
        filters: { status: 'active' },
      });
      expect(response.data.sort).toEqual({
        by: 'createdAt',
        order: 'desc',
      });

      const validation = ResponseValidator.validate(response, {
        expectPaginated: true,
      });
      expect(validation.valid).toBe(true);
    });

    it('should calculate totalPages correctly', () => {
      const response = paginated([], 1, 10, 25);
      expect(response.data.totalPages).toBe(3);

      const response2 = paginated([], 1, 10, 30);
      expect(response2.data.totalPages).toBe(3);

      const response3 = paginated([], 1, 10, 0);
      expect(response3.data.totalPages).toBe(0);
    });
  });

  describe('error()', () => {
    it('should create a valid error response', () => {
      const response = error('USER_NOT_FOUND', 'User does not exist', {
        userId: '123',
      });

      expect(response.success).toBe(false);
      expect(response.message).toBe('User does not exist');
      expect(response.data).toBeNull();
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('USER_NOT_FOUND');
      expect(response.error?.message).toBe('User does not exist');
      expect(response.error?.details).toEqual({ userId: '123' });
      expect(response.error?.timestamp).toBeDefined();

      const validation = ResponseValidator.validateEnvelope(response);
      expect(validation.valid).toBe(true);
    });

    it('should include timestamp in ISO format', () => {
      const response = error('TEST_ERROR', 'Test error');

      expect(response.error?.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });
  });

  describe('validationError()', () => {
    it('should create a valid validation error response', () => {
      const details = {
        email: 'Invalid email format',
        password: 'Password too weak',
      };
      const response = validationError(details, 'Validation failed');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Validation failed');
      expect(response.error?.code).toBe('VALIDATION_ERROR');
      expect(response.error?.details).toEqual(details);

      const validation = ResponseValidator.validateEnvelope(response);
      expect(validation.valid).toBe(true);
    });

    it('should use default message', () => {
      const response = validationError({ field: 'error' });

      expect(response.message).toBe('Validation failed');
      expect(response.error?.code).toBe('VALIDATION_ERROR');
    });
  });
});
