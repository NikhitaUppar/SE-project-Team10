jest.mock('../src/config/supabase', () => ({
  from: jest.fn(),
}));

const supabase = require('../src/config/supabase');
const {
  createCampaign,
  getCampaigns,
  getCampaignById,
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

describe('Campaign Browsing API (getCampaigns)', () => {
  let req;
  let res;
  let chain;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn(),
    };

    supabase.from.mockReturnValue(chain);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns paginated active campaigns with progress percentage for guest users (FR-16)', async () => {
    const mockData = [
      {
        id: 'camp-1',
        title: 'Emergency Medical Kit',
        goal_amount: 5000,
        raised_amount: 2500,
        category: 'Healthcare',
        status: 'active',
        deadline: '2026-11-01T00:00:00.000Z',
        campaign_files: [
          { file_url: 'https://example.com/med.png', file_type: 'image/png' },
        ],
      },
    ];

    chain.range.mockResolvedValue({
      data: mockData,
      count: 1,
      error: null,
    });

    await getCampaigns(req, res);

    expect(supabase.from).toHaveBeenCalledWith('campaigns');
    expect(chain.select).toHaveBeenCalledWith('*, campaign_files(file_url, file_type)', { count: 'exact' });
    expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    expect(res.status).toHaveBeenCalledWith(200);

    const response = res.json.mock.calls[0][0];
    expect(response.campaigns).toHaveLength(1);
    expect(response.campaigns[0].title).toBe('Emergency Medical Kit');
    expect(response.campaigns[0].progress_percentage).toBe(50);
    expect(response.campaigns[0].image_url).toBe('https://example.com/med.png');
    expect(response.pagination).toEqual({
      page: 1,
      limit: 9,
      total: 1,
      totalPages: 1,
    });
  });

  test('filters by category query param when provided (FR-17)', async () => {
    req.query = { category: 'Education' };

    chain.range.mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });

    await getCampaigns(req, res);

    expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    expect(chain.eq).toHaveBeenCalledWith('category', 'Education');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('does not filter by category when category is "All"', async () => {
    req.query = { category: 'All' };

    chain.range.mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });

    await getCampaigns(req, res);

    expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    expect(chain.eq).not.toHaveBeenCalledWith('category', 'All');
  });

  test('supports pagination parameters (page and limit)', async () => {
    req.query = { page: '2', limit: '5' };

    chain.range.mockResolvedValue({
      data: [],
      count: 12,
      error: null,
    });

    await getCampaigns(req, res);

    expect(chain.range).toHaveBeenCalledWith(5, 9);
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 12,
      totalPages: 3,
    });
  });

  test('returns 500 when Supabase query fails', async () => {
    chain.range.mockResolvedValue({
      data: null,
      count: null,
      error: { message: 'Database read failure' },
    });

    await getCampaigns(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to fetch campaigns',
    });
  });
});

describe('Get Campaign by ID API (getCampaignById)', () => {
  let req;
  let res;
  let chain;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { id: 'camp-123' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };

    supabase.from.mockReturnValue(chain);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns campaign details with calculated progress', async () => {
    const mockCampaign = {
      id: 'camp-123',
      title: 'Water Well Project',
      goal_amount: 20000,
      raised_amount: 15000,
      category: 'Community',
      campaign_files: [
        { file_url: 'https://example.com/well.jpg', file_type: 'image/jpeg' },
      ],
    };

    chain.maybeSingle.mockResolvedValue({
      data: mockCampaign,
      error: null,
    });

    await getCampaignById(req, res);

    expect(supabase.from).toHaveBeenCalledWith('campaigns');
    expect(chain.eq).toHaveBeenCalledWith('id', 'camp-123');
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.title).toBe('Water Well Project');
    expect(response.progress_percentage).toBe(75);
    expect(response.image_url).toBe('https://example.com/well.jpg');
  });

  test('returns 404 when campaign does not exist', async () => {
    chain.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await getCampaignById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Campaign not found',
    });
  });

  test('returns 500 on database error', async () => {
    chain.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    await getCampaignById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to fetch campaign',
    });
  });
});
