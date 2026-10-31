const supabase = require('../config/supabase');

// FR-16, FR-17: Get all active campaigns (public)
const getCampaigns = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 9));
    const offset = (page - 1) * limit;
    const { category, search, status } = req.query;

    // Build Supabase query - default to 'active' campaigns for public browse
    let query = supabase
      .from('campaigns')
      .select('*, campaign_files(file_url, file_type)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.eq('status', 'active');
    }

    // Filter by category query param if specified (FR-17)
    if (category && category !== 'All' && category !== 'all') {
      query = query.eq('category', category);
    }

    // Optional title search filter
    if (search && search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    // Order: deadline ascending (urgent first) when requested, otherwise newest first
    const sortBy = req.query.sort;
    if (sortBy === 'deadline') {
      query = query.order('deadline', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error.message);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }

    const total = count !== null && count !== undefined ? count : (data ? data.length : 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Calculate real-time % progress and extract thumbnail image
    const campaigns = (data || []).map((campaign) => {
      const goal = Number(campaign.goal_amount) || 0;
      const raised = Number(campaign.raised_amount) || 0;
      const progress_percentage = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
      const imageFile = campaign.campaign_files?.find((f) => f.file_type?.startsWith('image/'));
      const image_url = imageFile ? imageFile.file_url : null;

      return {
        ...campaign,
        progress_percentage,
        image_url,
      };
    });

    return res.status(200).json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('getCampaigns unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single campaign
const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*, campaign_files(file_url, file_type)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching campaign by id:', error.message);
      return res.status(500).json({ error: 'Failed to fetch campaign' });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const goal = Number(campaign.goal_amount) || 0;
    const raised = Number(campaign.raised_amount) || 0;
    const progress_percentage = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
    const imageFile = campaign.campaign_files?.find((f) => f.file_type?.startsWith('image/'));
    const image_url = imageFile ? imageFile.file_url : null;

    return res.status(200).json({
      ...campaign,
      progress_percentage,
      image_url,
    });
  } catch (err) {
    console.error('getCampaignById unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// FR-06: Create campaign

const createCampaign = async (req, res) => {
  try {
    const {
      title,
      description,
      goal_amount,
      category,
      deadline,
    } = req.body;

    // Check required fields
    if (
      typeof title !== 'string' || !title.trim() ||
      typeof description !== 'string' || !description.trim() ||
      goal_amount === undefined || goal_amount === null ||
      typeof category !== 'string' || !category.trim() ||
      !deadline
    ) {
      return res.status(400).json({
        error: 'All fields are required: title, description, goal_amount, category, deadline',
      });
    }

    // Validate the fundraising goal
    const goal = Number(goal_amount);

    if (!Number.isFinite(goal) || goal <= 0) {
      return res.status(400).json({
        error: 'goal_amount must be a positive number',
      });
    }

    // Validate the deadline
    const deadlineDate = new Date(deadline);

    if (
      Number.isNaN(deadlineDate.getTime()) ||
      deadlineDate <= new Date()
    ) {
      return res.status(400).json({
        error: 'deadline must be a valid future date',
      });
    }

    // Save the campaign in Supabase
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        owner_id: req.user.id,
        title: title.trim(),
        description: description.trim(),
        goal_amount: goal,
        category: category.trim(),
        deadline: deadlineDate.toISOString(),
        status: 'pending_review',
      })
      .select()
      .single();

    if (error) {
      console.error('Campaign creation failed:', error.message);

      return res.status(500).json({
        error: 'Failed to create campaign',
      });
    }

    return res.status(201).json({
      message: 'Campaign created successfully and is awaiting review',
      campaign: data,
    });
  } catch (err) {
    console.error('Campaign creation error:', err.message);

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
};


// FR-07: Upload campaign file

const uploadCampaignFile = async (req, res) => {
  let uploadedPath;

  try {
    // 1. Check whether a file was provided
    if (!req.file) {
      return res.status(400).json({
        error: 'Please upload a JPG, PNG, or PDF file (maximum 5MB)',
      });
    }

    // 2. Validate file type and size
    const allowedTypes = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf',
    };

    const extension = allowedTypes[req.file.mimetype];

    if (!extension) {
      return res.status(400).json({
        error: 'Only JPG, PNG, and PDF files are allowed',
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(413).json({
        error: 'File size must not exceed 5MB',
      });
    }

    // 3. Check campaign ID and ownership
    const campaignId = req.params.id;

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, owner_id')
      .eq('id', campaignId)
      .maybeSingle();

    if (campaignError) {
      console.error('Campaign lookup failed:', campaignError.message);

      return res.status(500).json({
        error: 'Failed to check campaign',
      });
    }

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
      });
    }

    if (campaign.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'You can only upload files to your own campaign',
      });
    }

    // 4. Create a unique storage path
    uploadedPath =
      `${campaignId}/${Date.now()}-${require('crypto').randomUUID()}.${extension}`;

    // 5. Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('campaign-files')
      .upload(uploadedPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('File upload failed:', uploadError.message);

      return res.status(500).json({
        error: 'Failed to upload file',
      });
    }

    // 6. Get the file's public URL
    const { data: publicUrlData } = supabase.storage
      .from('campaign-files')
      .getPublicUrl(uploadedPath);

    const fileUrl = publicUrlData.publicUrl;

    // 7. Save the URL and file type in the database
    const { data: savedFile, error: saveError } = await supabase
      .from('campaign_files')
      .insert({
        campaign_id: campaignId,
        file_url: fileUrl,
        file_type: req.file.mimetype,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Saving file record failed:', saveError.message);

      // Remove the uploaded file if its database record failed
      await supabase.storage
        .from('campaign-files')
        .remove([uploadedPath]);

      return res.status(500).json({
        error: 'Failed to save file information',
      });
    }

    // 8. Send success response
    return res.status(201).json({
      message: 'Campaign file uploaded successfully',
      file: savedFile,
    });
  } catch (err) {
    console.error('Campaign file upload error:', err.message);

    // Clean up a file if an unexpected error occurred after upload
    if (uploadedPath) {
      await supabase.storage
        .from('campaign-files')
        .remove([uploadedPath])
        .catch(() => {});
    }

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
};


// FR-09: Post campaign update
const postUpdate = async (req, res) => {
  // TODO (harishreddy2005): Implement
  // 1. Verify req.user.id === campaign.owner_id
  // 2. Insert into 'campaign_updates' table
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-20: Get campaign stats (owner only)
const getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user?.id;

    if (!ownerId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, owner_id, title, goal_amount, raised_amount')
      .eq('id', id)
      .maybeSingle();

    if (campaignError) throw campaignError;

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
      });
    }

    if (campaign.owner_id !== ownerId) {
      return res.status(403).json({
        error: 'You are not authorized to view these campaign stats',
      });
    }

    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('amount, donor_id, created_at')
      .eq('campaign_id', id)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (donationsError) throw donationsError;

    const completedDonations = donations || [];

    const totalRaised = completedDonations.reduce(
      (sum, donation) => sum + Number(donation.amount || 0),
      0
    );

    const donorCount = new Set(
      completedDonations
        .map((donation) => donation.donor_id)
        .filter(Boolean)
    ).size;

    const goal = Number(campaign.goal_amount) || 0;
    const raised = Number(campaign.raised_amount) || 0;

    const timelineMap = {};

    completedDonations.forEach((donation) => {
      const donationDate = donation.created_at
        ? donation.created_at.slice(0, 10)
        : 'Unknown';

      timelineMap[donationDate] =
        (timelineMap[donationDate] || 0) + Number(donation.amount || 0);
    });

    const timeline = Object.entries(timelineMap).map(([date, amount]) => ({
      date,
      amount,
    }));

    return res.status(200).json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        goal_amount: goal,
        raised_amount: raised,
        progress_percentage:
          goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0,
      },
      stats: {
        total_raised: totalRaised,
        donor_count: donorCount,
      },
      timeline,
    });
  } catch (err) {
    console.error('getCampaignStats error:', err.message);
    return res.status(500).json({
      error: 'Failed to fetch campaign statistics',
    });
  }
};

// FR-10: Auto-close expired campaigns (called by cron)
const closePastDeadlineCampaigns = async () => {
  // TODO (harishreddy2005): Implement
  // 1. Query campaigns where deadline < now() AND status='active'
  // 2. Update status to 'closed'
  console.log('[CRON] closePastDeadlineCampaigns — not implemented yet');
};
const getCampaignDonations = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));

    const { data, error } = await supabase
      .from('donations')
      .select('id, amount, is_anonymous, status, created_at, users(display_name)')
      .eq('campaign_id', id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching campaign donations:', error.message);
      return res.status(500).json({
        error: 'Failed to fetch campaign donations',
      });
    }

    const donations = (data || []).map((donation) => ({
      id: donation.id,
      amount: donation.amount,
      is_anonymous: Boolean(donation.is_anonymous),
      status: donation.status,
      created_at: donation.created_at,
      donor_name: donation.is_anonymous
        ? 'Anonymous'
        : donation.users?.display_name || 'Donor',
    }));

    return res.status(200).json({ donations });
  } catch (err) {
    console.error('getCampaignDonations unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
// Public homepage stats: total campaigns, total completed donations, total unique donors
const getPublicStats = async (req, res) => {
  try {
    const [campaignsRes, donationsRes, donorsRes] = await Promise.all([
      supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('donations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase
        .from('donations')
        .select('user_id', { count: 'exact' })
        .eq('status', 'completed')
        .not('user_id', 'is', null),
    ]);

    if (campaignsRes.error) throw campaignsRes.error;
    if (donationsRes.error) throw donationsRes.error;
    if (donorsRes.error) throw donorsRes.error;

    // Count unique donor IDs
    const uniqueDonors = new Set((donorsRes.data || []).map((r) => r.user_id)).size;

    return res.status(200).json({
      total_campaigns: campaignsRes.count || 0,
      total_donations: donationsRes.count || 0,
      total_donors: uniqueDonors,
    });
  } catch (err) {
    console.error('getPublicStats error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = {
  getCampaigns,
  getCampaignById,
  getCampaignDonations,
  createCampaign,
  uploadCampaignFile,
  postUpdate,
  getCampaignStats,
  getPublicStats,
  closePastDeadlineCampaigns,
};