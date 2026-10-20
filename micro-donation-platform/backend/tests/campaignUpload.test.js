
jest.mock('../src/config/supabase', () => ({
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
}));

const supabase = require('../src/config/supabase');
const {
  uploadCampaignFile,
} = require('../src/controllers/campaignController');

describe('Campaign File Upload API', () => {
  let req;
  let res;
  let campaignQuery;
  let storageBucket;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { id: 'campaign-123' },
      user: { id: 'user-123' },
      file: {
        originalname: 'proof.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test file'),
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    campaignQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };

    storageBucket = {
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
      remove: jest.fn(),
    };

    supabase.from.mockReturnValue(campaignQuery);
    supabase.storage.from.mockReturnValue(storageBucket);

    campaignQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'campaign-123',
        owner_id: 'user-123',
      },
      error: null,
    });

    storageBucket.upload.mockResolvedValue({ error: null });

    storageBucket.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: 'https://example.com/proof.pdf',
      },
    });

    storageBucket.remove.mockResolvedValue({ error: null });

    // Mock the database insert used to save file information.
    const fileInsertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'file-123',
          campaign_id: 'campaign-123',
          file_url: 'https://example.com/proof.pdf',
          file_type: 'application/pdf',
        },
        error: null,
      }),
    };

    supabase.from.mockImplementation((table) => {
      if (table === 'campaigns') {
        return campaignQuery;
      }

      if (table === 'campaign_files') {
        return fileInsertQuery;
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('rejects a missing file', async () => {
    req.file = undefined;

    await uploadCampaignFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('rejects an unsupported file type', async () => {
    req.file.mimetype = 'text/plain';

    await uploadCampaignFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('rejects a file larger than 5MB', async () => {
    req.file.size = 6 * 1024 * 1024;

    await uploadCampaignFile(req, res);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns 404 when the campaign does not exist', async () => {
    campaignQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await uploadCampaignFile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(storageBucket.upload).not.toHaveBeenCalled();
  });

  test('rejects uploads to another user campaign', async () => {
    campaignQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'campaign-123',
        owner_id: 'another-user',
      },
      error: null,
    });

    await uploadCampaignFile(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(storageBucket.upload).not.toHaveBeenCalled();
  });

  test('uploads a valid file successfully', async () => {
    await uploadCampaignFile(req, res);

    expect(supabase.storage.from).toHaveBeenCalledWith('campaign-files');
    expect(storageBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^campaign-123\/.*\.pdf$/),
      req.file.buffer,
      expect.objectContaining({
        contentType: 'application/pdf',
        upsert: false,
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Campaign file uploaded successfully',
        file: expect.objectContaining({
          id: 'file-123',
        }),
      })
    );
  });
});

