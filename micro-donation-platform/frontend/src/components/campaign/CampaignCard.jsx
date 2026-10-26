import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function CampaignCard({ campaign }) {
  const [imgError, setImgError] = useState(false);
  const canDonate = campaign?.accepting_donations === true;

  const goal = Number(campaign?.goal_amount) || 0;
  const raised = Number(campaign?.raised_amount) || 0;
  const progress = Math.min(
    100,
    campaign?.progress_percentage !== undefined
      ? Number(campaign.progress_percentage)
      : goal > 0
      ? Math.round((raised / goal) * 100)
      : 0
  );

  // Calculate days left until deadline
  const getDeadlineText = () => {
    if (!campaign?.deadline) return 'Ongoing';
    const deadlineDate = new Date(campaign.deadline);
    if (isNaN(deadlineDate.getTime())) return 'Ongoing';

    const diffDays = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Ended';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  // Get image URL or fallback placeholder
  const imageUrl = !imgError && (campaign?.image_url || campaign?.campaign_files?.[0]?.file_url);

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col overflow-hidden group">
      {/* Thumbnail Image Header */}
      <div className="relative h-48 w-full bg-gradient-to-tr from-indigo-100 via-purple-50 to-indigo-50 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={campaign?.title || 'Campaign'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-indigo-400 p-4">
            <svg
              className="w-12 h-12 mb-1 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="text-xs font-medium text-indigo-600/70 uppercase tracking-wider">
              {campaign?.category || 'Micro Cause'}
            </span>
          </div>
        )}

        {/* Category Pill Badge */}
        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm border border-indigo-50 uppercase tracking-wider">
          {campaign?.category || 'General'}
        </span>

        {/* Status Pill Badge */}
        <span className={`absolute top-3 right-3 ${canDonate ? 'bg-emerald-500/90' : 'bg-gray-500/90'} text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-sm capitalize`}>
          {campaign?.status || 'Active'}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Campaign Title */}
          <h3 className="font-bold text-gray-900 text-lg line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
            <Link to={`/campaigns/${campaign?.id}`}>
              {campaign?.title || 'Untitled Campaign'}
            </Link>
          </h3>

          {/* Description Excerpt */}
          <p className="text-gray-500 text-sm mt-2 line-clamp-2 leading-relaxed">
            {campaign?.description || 'Support this verified community initiative with a micro-donation.'}
          </p>
        </div>

        {/* Progress & Fundraising Stats */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-baseline mb-2 text-sm">
            <div>
              <span className="font-bold text-gray-900 text-base">
                ?{raised.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-gray-500 ml-1">raised</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">Goal: </span>
              <span className="font-semibold text-gray-700">
                ?{goal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Real-time Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>

          {/* Progress % and Deadline */}
          <div className="flex justify-between items-center text-xs text-gray-500 mt-2 font-medium">
            <span className="text-indigo-600 font-semibold">{progress}% funded</span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {getDeadlineText()}
            </span>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <Link
              to={`/campaigns/${campaign?.id}`}
              className="w-full block text-center bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 text-sm shadow-sm"
              id={`donate-btn-${campaign?.id}`}
            >
              {canDonate ? 'Donate Now' : 'View Campaign'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
