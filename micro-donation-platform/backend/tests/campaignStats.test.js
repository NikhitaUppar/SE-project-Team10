jest.mock('../src/config/supabase', () => ({
  from: jest.fn(),
}));

const supabase = require('../src/config/supabase');
const { getCampaignStats } = require('../src/controllers/campaignController');

describe('FR-20: Campaign Fundraising Statistics', () => {
  let req;
  let res;

  const campaign = {
    id: 'campaign-123',
    owner_id: 'owner-123',
    title: 'Help Local Students',
    goal_amount: 10000,
    raised_amount: 3000,
  };

  const donations = [
    {
      amount: 1000,
      donor_id: 'donor-1',
      created_at: '2026-10-28T10:00:00.000Z',
    },
    {
      amount: 500,
      donor_id: 'donor-1',
      created_at: '2026-10-28T12:00:00.000Z',
    },
    {
      amount: 1500,
      donor_id: 'donor-2',
      created_at: '2026-10-29T10:00:00.000Z',
    },
  ];

  const makeCampaignQuery = (result) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  });

  const makeDonationQuery = (result) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { id: 'campaign-123' },
      user: { id: 'owner-123' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns fundraising statistics for the campaign owner', async () => {
    const campaignQuery = makeCampaignQuery({
      data: campaign,
      error: null,
    });

    const donationQuery = makeDonationQuery({
      data: donations,
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(campaignQuery)
      .mockReturnValueOnce(donationQuery);

    await getCampaignStats(req, res);

    expect(supabase.from).toHaveBeenNthCalledWith(1, 'campaigns');
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'donations');

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      campaign: {
        id: 'campaign-123',
        title: 'Help Local Students',
        goal_amount: 10000,
        raised_amount: 3000,
        progress_percentage: 30,
      },
      stats: {
        total_raised: 3000,
        donor_count: 2,
      },
      timeline: [
        { date: '2026-10-28', amount: 1500 },
        { date: '2026-10-29', amount: 1500 },
      ],
    });
  });

  test('rejects requests without a logged-in user', async () => {
    req.user = undefined;

    await getCampaignStats(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('returns 404 when the campaign does not exist', async () => {
    supabase.from.mockReturnValueOnce(
      makeCampaignQuery({ data: null, error: null })
    );

    await getCampaignStats(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  test('prevents another user from viewing campaign statistics', async () => {
    req.user.id = 'another-user';

    supabase.from.mockReturnValueOnce(
      makeCampaignQuery({ data: campaign, error: null })
    );

    await getCampaignStats(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  test('returns 500 when fetching the campaign fails', async () => {
    supabase.from.mockReturnValueOnce(
      makeCampaignQuery({
        data: null,
        error: { message: 'Database error' },
      })
    );

    await getCampaignStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('returns 500 when fetching donations fails', async () => {
    supabase.from
      .mockReturnValueOnce(
        makeCampaignQuery({ data: campaign, error: null })
      )
      .mockReturnValueOnce(
        makeDonationQuery({
          data: null,
          error: { message: 'Donation query failed' },
        })
      );

    await getCampaignStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
