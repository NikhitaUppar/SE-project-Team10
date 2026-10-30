import { useState } from 'react';
import { Link } from 'react-router-dom';
import ShareButton from './ShareButton';
import { getRemainingDaysText } from '../../utils/dateUtils';

const CATEGORY_COLORS = {
  Healthcare: { bg: '#FFF0F0', text: '#991B1B', dot: '#EF4444' },
  Education:  { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  Relief:     { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  Animals:    { bg: '#F0FDF4', text: '#14532D', dot: '#22C55E' },
  Community:  { bg: '#EFF6FF', text: '#1E3A8A', dot: '#3B82F6' },
  Environment:{ bg: '#F0FDF4', text: '#064E3B', dot: '#10B981' },
};

export default function CampaignCard({ campaign }) {
  const [imgError, setImgError] = useState(false);

  const goal   = Number(campaign?.goal_amount) || 0;
  const raised = Number(campaign?.raised_amount) || 0;
  const progress = Math.min(100,
    campaign?.progress_percentage !== undefined
      ? Number(campaign.progress_percentage)
      : goal > 0 ? Math.round((raised / goal) * 100) : 0
  );

  const daysLeftText = getRemainingDaysText(campaign);
  const imageUrl = !imgError && (campaign?.image_url || campaign?.campaign_files?.[0]?.file_url);
  const catColor = CATEGORY_COLORS[campaign?.category] || { bg: '#FFF7ED', text: '#92400E', dot: '#EA580C' };

  const urgentDays = typeof daysLeftText === 'string' && daysLeftText.match(/^(\d+) day/);
  const isUrgent = daysLeftText === 'Ends today' || (urgentDays && Number(urgentDays[1]) <= 3);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: `1.5px solid ${isUrgent ? '#FCA5A5' : '#FED7AA'}`,
      boxShadow: '0 2px 12px rgba(194,65,12,0.07)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(194,65,12,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(194,65,12,0.07)'; }}
    >
      {/* Image / placeholder */}
      <div style={{ position: 'relative', height: 188, overflow: 'hidden', background: 'linear-gradient(135deg, #FFF7ED, #FFF0E8)' }}>
        {imageUrl ? (
          <img
            src={imageUrl} alt={campaign?.title || 'Campaign'}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: '2.5rem', opacity: 0.6 }}>
              {campaign?.category === 'Healthcare' ? '🏥' :
               campaign?.category === 'Education' ? '📚' :
               campaign?.category === 'Animals' ? '🐾' :
               campaign?.category === 'Environment' ? '🌱' :
               campaign?.category === 'Relief' ? '🤝' : '🧡'}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {campaign?.category || 'Cause'}
            </span>
          </div>
        )}

        {/* Category badge */}
        <span style={{
          position: 'absolute', top: 12, left: 12,
          background: catColor.bg, color: catColor.text,
          fontSize: '0.68rem', fontWeight: 700,
          padding: '4px 10px', borderRadius: 999,
          display: 'flex', alignItems: 'center', gap: 4,
          border: `1px solid ${catColor.dot}33`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: catColor.dot, display: 'inline-block' }} />
          {campaign?.category || 'General'}
        </span>

        {/* Urgent badge */}
        {isUrgent && (
          <span style={{
            position: 'absolute', top: 12, right: 12,
            background: '#FEF2F2', color: '#B91C1C',
            fontSize: '0.68rem', fontWeight: 700,
            padding: '4px 10px', borderRadius: 999,
            border: '1px solid #FECACA',
          }}>
            ⏰ Urgent
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.4, margin: 0 }}>
            <Link to={`/campaigns/${campaign?.id}`} style={{ color: '#1C0A00', textDecoration: 'none' }}>
              {campaign?.title || 'Untitled Campaign'}
            </Link>
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#92400E', marginTop: 6, lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {campaign?.description || 'Support this verified community initiative.'}
          </p>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#C2410C' }}>
                ₹{raised.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#92400E', marginLeft: 4 }}>raised</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#A16207' }}>
              of ₹{goal.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Track */}
          <div style={{ height: 6, borderRadius: 999, background: '#FED7AA', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${progress}%`,
              background: progress >= 80 ? 'linear-gradient(90deg,#EA580C,#F97316)' : 'linear-gradient(90deg,#C2410C,#EA580C)',
              transition: 'width 0.6s ease',
            }} role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: '0.72rem' }}>
            <span style={{ fontWeight: 700, color: '#EA580C' }}>{progress}% funded</span>
            <span style={{ color: isUrgent ? '#B91C1C' : '#A16207', fontWeight: isUrgent ? 700 : 400 }}>
              {daysLeftText}
            </span>
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Link to={`/campaigns/${campaign?.id}`} style={{
              flex: 1, textAlign: 'center',
              background: 'linear-gradient(135deg, #C2410C, #EA580C)',
              color: '#fff', textDecoration: 'none',
              fontWeight: 700, fontSize: '0.82rem',
              padding: '9px 0', borderRadius: 8,
              boxShadow: '0 2px 8px rgba(194,65,12,0.25)',
            }}>
              Donate Now
            </Link>
            <ShareButton campaign={campaign} variant="icon" />
          </div>
        </div>
      </div>
    </div>
  );
}
