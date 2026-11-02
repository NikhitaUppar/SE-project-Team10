jest.mock('../src/config/supabase', () => ({
  from: jest.fn(),
}));

const supabase = require('../src/config/supabase');
const { getMyCampaigns } = require('../src/controllers/userController');

describe('FR-20: Get owner campaigns', () => {
  let req;
  let res;
  let chain;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { id: 'owner-123' },
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

  test('returns campaigns belonging to the logged-in owner', async () => {
    const campaigns = [
      {
        id: 'campaign-1',
        title: 'Help Local Students',
        goal_amount: 10000,
        raised_amount: 3000,
        status: 'active',
      },
    ];

    chain.order.mockResolvedValue({
      data: campaigns,
      error: null,
    });

    await getMyCampaigns(req, res);

    expect(supabase.from).toHaveBeenCalledWith('campaigns');
    expect(chain.eq).toHaveBeenCalledWith('owner_id', 'owner-123');
    expect(chain.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ campaigns });
  });

  test('returns 401 when the user is not logged in', async () => {
    req.user = null;

    await getMyCampaigns(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns an empty array when the owner has no campaigns', async () => {
    chain.order.mockResolvedValue({
      data: null,
      error: null,
    });

    await getMyCampaigns(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ campaigns: [] });
  });

  test('returns 500 when the database query fails', async () => {
    chain.order.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    await getMyCampaigns(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to fetch campaigns',
    });
  });

  test('returns 500 when an unexpected error occurs', async () => {
    chain.order.mockRejectedValue(new Error('Network error'));

    await getMyCampaigns(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });
});
