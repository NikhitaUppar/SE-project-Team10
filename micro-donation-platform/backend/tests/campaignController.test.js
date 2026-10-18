
jest.mock('../src/config/supabase', () => ({
  from: jest.fn(),
}));

const supabase = require('../src/config/supabase');
const {
  createCampaign,
} = require('../src/controllers/campaignController');

describe('Campaign Creation API', () => {
  let req;
  let res;
  let query;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { id: 'user-123' },
      body: {
        title: 'Help Local Students',
        description: 'Support students with school supplies.',
        goal_amount: 10000,
        category: 'Education',
        deadline: '2099-12-31T23:59:59.000Z',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    query = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    supabase.from.mockReturnValue(query);

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('creates a campaign successfully', async () => {
    const savedCampaign = {
      id: 'campaign-123',
      title: 'Help Local Students',
      status: 'pending_review',
    };

    query.single.mockResolvedValue({
      data: savedCampaign,
      error: null,
    });

    await createCampaign(req, res);

    expect(supabase.from).toHaveBeenCalledWith('campaigns');
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'user-123',
        title: 'Help Local Students',
        goal_amount: 10000,
        status: 'pending_review',
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign: savedCampaign,
      })
    );
  });

  test('rejects missing required fields', async () => {
    req.body.title = '';

    await createCampaign(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('rejects an invalid fundraising goal', async () => {
    req.body.goal_amount = -100;

    await createCampaign(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('rejects a past deadline', async () => {
    req.body.deadline = '2000-01-01T00:00:00.000Z';

    await createCampaign(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns 500 when the database fails', async () => {
    query.single.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    await createCampaign(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to create campaign',
    });
  });
});

