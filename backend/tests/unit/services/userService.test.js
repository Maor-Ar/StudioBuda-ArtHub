import userService from '../../../src/services/userService.js';
import { db } from '../../../src/config/firebase.js';
import { NotFoundError } from '../../../src/utils/errors.js';

// Mock dependencies
jest.mock('../../../src/config/firebase.js');
jest.mock('../../../src/services/cacheService.js');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user with default values', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'user123' });
      db.collection.mockReturnValue({ add: mockAdd });

      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '0501234567',
        email: 'john@example.com',
        passwordHash: 'hashed',
      };

      const result = await userService.createUser(userData);

      expect(result).toHaveProperty('id', 'user123');
      expect(result).toHaveProperty('hasPurchasedTrial', false);
      expect(result).toHaveProperty('role', 'user');
    });
  });

  describe('getUserById', () => {
    it('should throw NotFoundError if user does not exist', async () => {
      const mockDoc = {
        get: jest.fn().mockResolvedValue({ exists: false }),
      };
      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      await expect(userService.getUserById('nonexistent')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});

