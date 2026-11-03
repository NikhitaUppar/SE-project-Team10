import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Education',
  'Medical',
  'Food',
  'Environment',
  'Animals',
  'Shelter',
  'Emergency',
];

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [form, setForm] = useState({
    title: '',
    description: '',
    goal_amount: '',
    category: 'Education',
    deadline: '',
  });

  const [impactStatements, setImpactStatements] = useState(['', '', '']);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  const set = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const setImpact = (i, val) => {
    setImpactStatements(prev =>
      prev.map((s, idx) => idx === i ? val : s)
    );
  };

  const validate = () => {
    const errs = {};

    if (!form.title.trim()) {
      errs.title = 'Title is required.';
    }

    if (!form.description.trim()) {
      errs.description = 'Description is required.';
    }

    const goal = Number(form.goal_amount);

    if (
      !form.goal_amount ||
      !Number.isFinite(goal) ||
      goal <= 0
    ) {
      errs.goal_amount = 'Enter a valid goal amount.';
    }

    if (!form.category) {
      errs.category = 'Select a category.';
    }

    if (!form.deadline) {
      errs.deadline = 'Deadline is required.';
    } else if (
      new Date(form.deadline).toDateString() ===
      new Date().toDateString()
    ) {
      // Today's date is allowed.
    } else if (new Date(form.deadline) < new Date()) {
      errs.deadline = 'Deadline must be a future date.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errs = validate();

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        goal_amount: Number(form.goal_amount),
        impact_statements: impactStatements
          .map(s => s.trim())
          .filter(Boolean),
      };

      const res = await api.post('/campaigns', payload);
      const campaignId = res.data.campaign?.id;

      if (file && campaignId) {
        const fd = new FormData();
        fd.append('file', file);

        await api.post(`/campaigns/${campaignId}/upload`, fd, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      navigate(`/campaigns/${campaignId || ''}`);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Failed to create campaign. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasErr) => ({
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${hasErr ? '#FCA5A5' : '#FED7AA'}`,
    borderRadius: 10,
    fontSize: '0.9rem',
    background: '#FFFBF7',
    color: '#1C0A00',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  });

  const labelStyle = {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#78350F',
    display: 'block',
    marginBottom: 6,
  };

  const errStyle = {
    fontSize: '0.75rem',
    color: '#B91C1C',
    marginTop: 4,
  };

  if (loading || !user) {
    return <p className="text-center py-20">Loading...</p>;
  }

  return (
    <div style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: '32px max(16px, env(safe-area-inset-left, 0px)) 64px',
    }}>

      <h1 style={{
        fontFamily: "'Playfair Display',Georgia,serif",
        fontSize: 'clamp(1.5rem,3vw,2rem)',
        fontWeight: 900,
        color: '#7C2D12',
        marginBottom: 6,
      }}>
        Start a Campaign
      </h1>

      <p style={{
        color: '#A16207',
        fontSize: '0.9rem',
        marginBottom: 32,
      }}>
        Share your cause and inspire others to contribute.
      </p>

      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#B91C1C',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: '0.85rem',
          marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >

        {/* Campaign Title */}
        <div>
          <label style={labelStyle}>Campaign Title *</label>

          <input
            style={inputStyle(fieldErrors.title)}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Help build a school in rural India"
          />

          {fieldErrors.title && (
            <p style={errStyle}>{fieldErrors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description *</label>

          <textarea
            style={{
              ...inputStyle(fieldErrors.description),
              minHeight: 110,
              resize: 'vertical',
            }}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe your campaign and why it matters…"
          />

          {fieldErrors.description && (
            <p style={errStyle}>{fieldErrors.description}</p>
          )}
        </div>

        {/* Fundraising Goal and Category */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>

          <div>
            <label style={labelStyle}>
              Fundraising Goal (₹) *
            </label>

            <input
              type="number"
              min="1"
              style={inputStyle(fieldErrors.goal_amount)}
              value={form.goal_amount}
              onChange={e => set('goal_amount', e.target.value)}
              placeholder="50000"
            />

            {fieldErrors.goal_amount && (
              <p style={errStyle}>{fieldErrors.goal_amount}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Category *</label>

            <select
              style={{
                ...inputStyle(fieldErrors.category),
                appearance: 'none',
              }}
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {fieldErrors.category && (
              <p style={errStyle}>{fieldErrors.category}</p>
            )}
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label style={labelStyle}>Deadline *</label>

          <input
            type="date"
            style={inputStyle(fieldErrors.deadline)}
            value={form.deadline}
            onChange={e => set('deadline', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />

          {fieldErrors.deadline && (
            <p style={errStyle}>{fieldErrors.deadline}</p>
          )}
        </div>

        {/* Impact Statements */}
        <div style={{
          background: '#FFF7ED',
          border: '1.5px solid #FED7AA',
          borderRadius: 14,
          padding: '20px 20px 16px',
        }}>

          <label style={{
            ...labelStyle,
            fontSize: '0.85rem',
            marginBottom: 4,
          }}>
            Your Impact (optional)
          </label>

          <p style={{
            fontSize: '0.75rem',
            color: '#A16207',
            marginBottom: 14,
            marginTop: 0,
          }}>
            Add up to 3 statements showing what donations can achieve
            (e.g. "₹100 provides school supplies for a child").
          </p>

          {impactStatements.map((stmt, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#C2410C,#EA580C)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {i + 1}
              </span>

              <input
                style={{ ...inputStyle(false), marginBottom: 0 }}
                value={stmt}
                onChange={e => setImpact(i, e.target.value)}
                placeholder={`Impact statement ${i + 1}`}
              />
            </div>
          ))}
        </div>

        {/* Supporting Document */}
        <div>
          <label style={labelStyle}>
            Supporting Media (optional)
          </label>

          <p style={{
            fontSize: '0.75rem',
            color: '#A16207',
            marginBottom: 8,
            marginTop: 0,
          }}>
            Upload an image, PDF, or video (MP4/WebM/MOV, max 50MB) to support your campaign.
          </p>

          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf,video/mp4,video/webm,video/quicktime"
            onChange={e => setFile(e.target.files?.[0] || null)}
            style={{
              fontSize: '0.85rem',
              color: '#78350F',
            }}
          />

          {file && (
            <p style={{
              fontSize: '0.75rem',
              color: '#14532D',
              marginTop: 4,
            }}>
              Selected: {file.name}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: submitting
              ? '#FCA5A5'
              : 'linear-gradient(135deg,#C2410C,#EA580C)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '14px',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(194,65,12,0.3)',
            fontFamily: 'inherit',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {submitting ? 'Creating…' : 'Create Campaign →'}
        </button>

      </form>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}