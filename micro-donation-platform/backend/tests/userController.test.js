
jest.mock('../src/config/supabase', () => ({
  from: jest.fn(),
}));

const supabase = require('../src/config/supabase');
const { getMyDonations } = require('../src/controllers/userController');

describe('User Controller - getMyDonations (FR-19)', () => {
  let req;
  let res;
  let chain;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { id: 'donor-123' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn(),
    };

    supabase.from.mockReturnValue(chain);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns 401 if donorId is not present', async () => {
    req.user = null;

    await getMyDonations(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
  });

  test('returns donation history sorted newest-first successfully', async () => {
    const mockDonations = [
      {
        id: 'don-1',
        campaign_id: 'camp-1',
        amount: 500,
        is_anonymous: true,
        status: 'completed',
        created_at: '2026-10-26T12:00:00Z',
        campaigns: { title: 'Emergency Flood Relief' },
      },
      {
        id: 'don-2',
        campaign_id: 'camp-2',
        amount: 100,
        is_anonymous: false,
        status: 'completed',
        created_at: '2026-10-25T08:00:00Z',
        campaigns: { title: 'School Supplies Drive' },
      },
    ];

    chain.order.mockResolvedValue({
      data: mockDonations,
      error: null,
    });

    await getMyDonations(req, res);

    expect(supabase.from).toHaveBeenCalledWith('donations');
    expect(chain.select).toHaveBeenCalledWith(
      'id, campaign_id, amount, is_anonymous, status, created_at, campaigns(title)'
    );
    expect(chain.eq).toHaveBeenCalledWith('donor_id', 'donor-123');
    expect(chain.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      stats: {
        totalDonated: 600,
        campaignsSupported: 2,
      },
      donations: [
        {
          ...mockDonations[0],
          campaign_name: 'Emergency Flood Relief',
        },
        {
          ...mockDonations[1],
          campaign_name: 'School Supplies Drive',
        },
      ],
    });
  });

  test('returns 500 on database error', async () => {
    chain.order.mockResolvedValue({
      data: null,
      error: { message: 'Database query timeout' },
    });

    await getMyDonations(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to fetch donation history',
    });
  });

  test('returns 500 on unexpected exception', async () => {
    chain.order.mockRejectedValue(new Error('Unexpected network crash'));

    await getMyDonations(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });
});
