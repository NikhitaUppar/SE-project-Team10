
jest.mock('../src/config/supabase', () => ({
  from: jest.fn(),
}));

const supabase = require('../src/config/supabase');

const {
  getPendingCampaigns,
  approveCampaign,
  rejectCampaign,
} = require('../src/controllers/adminController');

describe('Admin Controller - Issue #35', () => {
  let req;
  let res;
  let chain;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { id: 'camp-123' },
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    supabase.from.mockReturnValue(chain);

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Get pending campaigns

  test('fetches pending campaigns successfully', async () => {
    const campaigns = [
      {
        id: 'camp-123',
        title: 'Medical Help',
        status: 'pending_review',
        campaign_files: [
          {
            file_url: 'https://example.com/document.pdf',
            file_type: 'application/pdf',
          },
        ],
      },
    ];

    chain.order.mockResolvedValue({
      data: campaigns,
      error: null,
    });

    await getPendingCampaigns(req, res);

    expect(supabase.from).toHaveBeenCalledWith('campaigns');

    expect(chain.select).toHaveBeenCalledWith(
      '*, campaign_files(file_url, file_type)'
    );

    expect(chain.eq).toHaveBeenCalledWith(
      'status',
      'pending_review'
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      campaigns,
    });
  });

  test('returns 500 when fetching pending campaigns fails', async () => {
    chain.order.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    await getPendingCampaigns(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to fetch pending campaigns',
    });
  });

  test('returns 500 on unexpected fetching error', async () => {
    chain.order.mockRejectedValue(
      new Error('Unexpected network error')
    );

    await getPendingCampaigns(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });

  // Approve campaign

  test('approves campaign and marks it as verified', async () => {
    const approvedCampaign = {
      id: 'camp-123',
      status: 'active',
      is_verified: true,
      rejection_reason: null,
    };

    chain.single.mockResolvedValue({
      data: approvedCampaign,
      error: null,
    });

    await approveCampaign(req, res);

    expect(supabase.from).toHaveBeenCalledWith('campaigns');

    expect(chain.update).toHaveBeenCalledWith({
      status: 'active',
      is_verified: true,
      rejection_reason: null,
    });

    expect(chain.eq).toHaveBeenNthCalledWith(
      1,
      'id',
      'camp-123'
    );

    expect(chain.eq).toHaveBeenNthCalledWith(
      2,
      'status',
      'pending_review'
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Campaign approved and verified successfully',
      campaign: approvedCampaign,
    });
  });

  test('returns 404 if pending campaign cannot be approved', async () => {
    chain.single.mockResolvedValue({
      data: null,
      error: { message: 'Campaign not found' },
    });

    await approveCampaign(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 500 on unexpected approval error', async () => {
    chain.single.mockRejectedValue(
      new Error('Unexpected network error')
    );

    await approveCampaign(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });

  // Reject campaign

  test('rejects campaign and saves rejection reason', async () => {
    req.body = {
      reason: 'Please upload a valid document',
    };

    const rejectedCampaign = {
      id: 'camp-123',
      status: 'rejected',
      is_verified: false,
      rejection_reason: 'Please upload a valid document',
    };

    chain.single.mockResolvedValue({
      data: rejectedCampaign,
      error: null,
    });

    await rejectCampaign(req, res);

    expect(chain.update).toHaveBeenCalledWith({
      status: 'rejected',
      is_verified: false,
      rejection_reason: 'Please upload a valid document',
    });

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Campaign rejected successfully',
      campaign: rejectedCampaign,
    });
  });

  test('returns 400 if rejection reason is missing', async () => {
    req.body = {
      reason: '   ',
    };

    await rejectCampaign(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Rejection reason is required',
    });

    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns 404 if pending campaign cannot be rejected', async () => {
    req.body = {
      reason: 'Invalid documents',
    };

    chain.single.mockResolvedValue({
      data: null,
      error: { message: 'Campaign not found' },
    });

    await rejectCampaign(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 500 on unexpected rejection error', async () => {
    req.body = {
      reason: 'Invalid documents',
    };

    chain.single.mockRejectedValue(
      new Error('Unexpected network error')
    );

    await rejectCampaign(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });
});
