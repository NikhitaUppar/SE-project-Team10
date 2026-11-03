import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function CampaignUpdates({ campaign }) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const isOwner = user?.role === 'campaign_owner' && user.id === campaign.owner_id;
  const canPost = isOwner && campaign.status === 'active';

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    api.get(`/campaigns/${campaign.id}/updates`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setUpdates(data.updates); })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError('Unable to load progress updates. Please try again.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [campaign.id, reload]);

  const postUpdate = async event => {
    event.preventDefault();
    setPostError('');
    setNotice('');
    const text = content.trim();
    if (!text || text.length > 5000) {
      setPostError('Enter an update containing 1 to 5000 characters.');
      return;
    }
    setPosting(true);
    try {
      const { data } = await api.post(`/campaigns/${campaign.id}/updates`, { content: text });
      // Display the confirmed database record immediately without reloading the page.
      setUpdates(previous => [...previous.filter(update => update.id !== data.update.id), data.update]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id.localeCompare(b.id)));
      setContent('');
      setNotice('Your progress update has been posted.');
      if (loadError) setReload(value => value + 1);
    } catch (error) {
      setPostError(error.response?.data?.error || 'Unable to post your update. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <section aria-labelledby="progress-updates-heading" className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 id="progress-updates-heading" className="text-xl font-bold text-gray-900">Progress updates</h2>
      <p className="mt-1 text-sm text-gray-500">News from the campaign owner, oldest first.</p>
      {loading && <p role="status" className="mt-4 text-sm text-gray-500">Loading updates…</p>}
      {loadError && <div className="mt-4">
        <p role="alert" className="text-sm text-rose-700">{loadError}</p>
        <button type="button" onClick={() => setReload(value => value + 1)} disabled={posting || loading}
          className="mt-2 text-sm text-indigo-600 hover:underline">Retry loading updates</button>
      </div>}
      {!loading && !loadError && updates.length === 0 && <p className="mt-4 text-sm text-gray-500">No progress updates yet.</p>}
      <ol className="mt-5 space-y-4">
        {updates.map(update => (
          <li key={update.id} className="border-l-2 border-indigo-200 pl-4">
            <time dateTime={update.created_at} className="text-xs text-gray-500">{new Date(update.created_at).toLocaleString()}</time>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">{update.content}</p>
          </li>
        ))}
      </ol>
      {canPost && <form onSubmit={postUpdate} className="mt-6 border-t border-gray-100 pt-5">
        <label htmlFor="progress-update" className="block text-sm font-semibold text-gray-700">Share a progress update</label>
        <textarea id="progress-update" name="content" rows={4} maxLength={5000} required
          value={content} onChange={event => setContent(event.target.value)} disabled={posting}
          placeholder="Tell supporters how your campaign is progressing…"
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
        <p className="mt-1 text-xs text-gray-500">{content.length}/5000 characters</p>
        {postError && <p role="alert" className="mt-2 text-sm text-rose-700">{postError}</p>}
        {notice && <p role="status" className="mt-2 text-sm text-emerald-700">{notice}</p>}
        <button type="submit" disabled={posting || loading}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {posting ? 'Posting…' : 'Post Update'}
        </button>
      </form>}
      {isOwner && !canPost && <p className="mt-5 text-sm text-gray-500">You can post progress updates when this campaign is active.</p>}
    </section>
  );
}
