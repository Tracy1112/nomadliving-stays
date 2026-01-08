/**
 * Tests for utils/supabase.ts
 * 
 * Tests image upload functionality with Supabase Storage
 */

import { uploadImage } from '@/utils/supabase';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js');

describe('Supabase Image Upload', () => {
  const mockSupabaseClient = {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({
          data: {
            publicUrl: 'https://example.com/image.jpg',
          },
        })),
      })),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_KEY = 'test-key';
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_KEY;
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const mockFile = new File(['test content'], 'test-image.jpg', {
        type: 'image/jpeg',
      });

      const mockStorageBucket = {
        upload: jest.fn().mockResolvedValue({
          data: { path: '1234567890-test-image.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn(() => ({
          data: {
            publicUrl: 'https://example.com/storage/v1/object/public/home-away-draft/1234567890-test-image.jpg',
          },
        })),
      };

      mockSupabaseClient.storage.from = jest.fn(() => mockStorageBucket);

      const result = await uploadImage(mockFile);

      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-key'
      );
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('home-away-draft');
      expect(mockStorageBucket.upload).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should sanitize filename', async () => {
      const mockFile = new File(['test'], 'test file (1).jpg', {
        type: 'image/jpeg',
      });

      const mockStorageBucket = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'sanitized.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn(() => ({
          data: {
            publicUrl: 'https://example.com/image.jpg',
          },
        })),
      };

      mockSupabaseClient.storage.from = jest.fn(() => mockStorageBucket);

      await uploadImage(mockFile);

      // Verify filename was sanitized (spaces and parentheses removed)
      // Note: spaces become underscores, so "test file (1)" becomes "test_file__1_"
      const uploadCall = mockStorageBucket.upload.mock.calls[0];
      expect(uploadCall[0]).toMatch(/^\d+-test_file.*\.jpg$/);
      expect(uploadCall[0]).not.toContain(' ');
      expect(uploadCall[0]).not.toContain('(');
      expect(uploadCall[0]).not.toContain(')');
    });

    it('should throw error when upload fails', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const mockStorageBucket = {
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' },
        }),
        getPublicUrl: jest.fn(() => ({
          data: {
            publicUrl: '',
          },
        })),
      };

      mockSupabaseClient.storage.from = jest.fn(() => mockStorageBucket);

      await expect(uploadImage(mockFile)).rejects.toThrow('Image upload failed');
    });

    it('should throw error when environment variables are missing', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_KEY;

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(uploadImage(mockFile)).rejects.toThrow(
        'Missing required environment variables'
      );
    });

    it('should add timestamp to filename', async () => {
      const mockFile = new File(['test'], 'image.jpg', { type: 'image/jpeg' });
      const beforeTime = Date.now();

      const mockStorageBucket = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn(() => ({
          data: {
            publicUrl: 'https://example.com/image.jpg',
          },
        })),
      };

      mockSupabaseClient.storage.from = jest.fn(() => mockStorageBucket);

      await uploadImage(mockFile);

      const afterTime = Date.now();
      const uploadCall = mockStorageBucket.upload.mock.calls[0];
      const filename = uploadCall[0];
      const timestamp = parseInt(filename.split('-')[0]);

      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});

