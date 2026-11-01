
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

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (Number(form.goal_amount) <= 0) {
      setError('Please enter a valid fundraising goal.');
      return;
    }

    if (!form.deadline) {
      setError('Please select a campaign deadline.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post('/campaigns', {
        ...form,
        goal_amount: Number(form.goal_amount),
        deadline: new Date(form.deadline).toISOString(),
      });

      alert(response.data.message || 'Campaign created successfully!');
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Unable to create campaign. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <p className="text-center py-20">Loading...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Create a Campaign
      </h1>

      <p className="text-gray-500 mb-8">
        Share your cause and make a difference.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-semibold mb-2">
            Campaign Title
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder="Enter campaign title"
            className="w-full border rounded-lg p-3"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows="5"
            placeholder="Explain why this campaign is important..."
            className="w-full border rounded-lg p-3"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Fundraising Goal (₹)
          </label>
          <input
            type="number"
            name="goal_amount"
            value={form.goal_amount}
            onChange={handleChange}
            required
            min="1"
            placeholder="Example: 50000"
            className="w-full border rounded-lg p-3"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Category
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            className="w-full border rounded-lg p-3"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Campaign Deadline
          </label>
          <input
            type="date"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            required
            min={new Date().toLocaleDateString('en-CA')}
            className="w-full border rounded-lg p-3"
          />
        </div>

        {error && (
          <p className="text-red-600 font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-600 text-white font-semibold py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>
    </div>
  );
}
