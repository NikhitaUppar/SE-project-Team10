import { useState } from 'react';

/**
 * Reusable Share Button component with native Web Share API support
 * and fallback to clipboard copy with visual feedback toast/tooltip.
 *
 * @param {Object} props
 * @param {Object} props.campaign - Campaign object { id, title, description, ... }
 * @param {'button'|'icon'} [props.variant='button'] - Display style ('button' or 'icon')
 * @param {string} [props.className] - Additional classes
 */
export default function ShareButton({ campaign, variant = 'button', className = '' }) {
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!campaign?.id) {
      setFeedback({ type: 'error', message: 'Unable to share: missing campaign ID' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const campaignUrl = `${window.location.origin}/campaigns/${campaign.id}`;
    const shareData = {
      title: campaign.title || 'Support this Campaign',
      text: campaign.description
        ? campaign.description.slice(0, 120) + '...'
        : 'Support this verified community initiative with a micro-donation.',
      url: campaignUrl,
    };

    setIsSharing(true);

    // 1. Try Web Share API on supported devices
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        setFeedback({ type: 'success', message: 'Campaign link shared!' });
        setTimeout(() => setFeedback(null), 2500);
        setIsSharing(false);
        return;
      } catch (err) {
        // User cancelling native share sheet is an AbortError, not a failure
        if (err.name === 'AbortError') {
          setIsSharing(false);
          return;
        }
        // If native share failed for any other reason, proceed to clipboard fallback
        console.warn('Native Web Share failed, falling back to clipboard copy:', err);
      }
    }

    // 2. Clipboard copy fallback
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(campaignUrl);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = campaignUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) {
          throw new Error('execCommand returned false');
        }
      }

      setFeedback({ type: 'success', message: 'Campaign link copied!' });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      console.error('Clipboard copy error:', err);
      setFeedback({ type: 'error', message: 'Failed to copy link. Please copy manually.' });
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setIsSharing(false);
    }
  };

  const isSuccess = feedback?.type === 'success';
  const isError = feedback?.type === 'error';

  if (variant === 'icon') {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          title="Share Campaign"
          aria-label="Share campaign"
          id={`share-btn-${campaign?.id}`}
          className={`p-2.5 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
            isSuccess
              ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
              : isError
              ? 'bg-rose-50 text-rose-600 border-rose-300'
              : 'bg-white text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border-gray-200 shadow-sm'
          } ${className}`}
        >
          {isSuccess ? (
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          )}
        </button>

        {/* Feedback Tooltip / Toast Popup */}
        {feedback && (
          <div
            role="status"
            className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-md shadow-md transition-all z-20 ${
              isSuccess ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'
            }`}
          >
            {feedback.message}
            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${
                isSuccess ? 'border-t-emerald-700' : 'border-t-rose-700'
              }`}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleShare}
        disabled={isSharing}
        aria-label="Share campaign"
        id={`share-btn-${campaign?.id}`}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
          isSuccess
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
            : isError
            ? 'bg-rose-50 text-rose-700 border-rose-300'
            : 'bg-white text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 border-gray-200'
        } ${className}`}
      >
        {isSuccess ? (
          <>
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span>{feedback.message}</span>
          </>
        ) : isError ? (
          <>
            <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>{feedback.message}</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>Share</span>
          </>
        )}
      </button>

      {/* Floating feedback for button variant if needed */}
      {feedback && (
        <span
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {feedback.message}
        </span>
      )}
    </div>
  );
}
