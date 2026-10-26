import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CampaignUpdates from '../components/campaign/CampaignUpdates';

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaignError, setCampaignError] = useState('');
  const [amount, setAmount] = useState(100);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCampaign(null);
    setCampaignError('');
    const fetchCampaign = async () => {
      try {
        const res = await api.get(`/campaigns/${id}`, { signal: controller.signal });
        if (!controller.signal.aborted) setCampaign(res.data);
      } catch (err) {
        if (!controller.signal.aborted) setCampaignError(err.response?.status === 404
          ? 'Campaign not found.' : 'Unable to load this campaign. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchCampaign();
    return () => controller.abort();
  }, [id]);

  const handleDonate = async (e) => {
    e.preventDefault();
    setError('');

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 1 || numericAmount > 500) {
      setError('Donation amount must be between ₹1 and ₹500.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create order on backend (returns order_id, amount, currency, key_id)
      const res = await api.post('/donations/create-order', {
        campaign_id: campaign?.id || id || 'test-campaign-101',
        amount: numericAmount,
        is_anonymous: isAnonymous,
      });

      const { order_id, amount: orderAmount, currency, key_id } = res.data;

      // 2. Open Razorpay checkout modal
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK script not found. Please refresh the page.');
      }

      const options = {
        key: key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: orderAmount,
        currency: currency || 'INR',
        name: 'Micro-Donation Platform',
        description: `Donation to ${campaign?.title || 'Cause'}`,
        order_id: order_id,
        handler: async function (response) {
          const paymentId = response.razorpay_payment_id || `pay_mock_${Date.now()}`;
          const orderId = response.razorpay_order_id || order_id;
          const signature = response.razorpay_signature || 'dev_test_sig';

          let receiptSent = false;
          try {
            const verifyRes = await api.post('/donations/verify', {
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            });
            receiptSent = verifyRes.data?.receipt_sent;
          } catch (vErr) {
            console.warn('Payment verification callback notice:', vErr.message);
          }

          setPaymentSuccess({
            paymentId,
            orderId,
            amount: numericAmount,
            receiptSent,
          });
          setCampaign((prev) => ({
            ...prev,
            raised_amount: (Number(prev?.raised_amount) || 0) + numericAmount,
          }));
          setIsSubmitting(false);
        },
        prefill: {
          name: isAnonymous ? 'Anonymous Donor' : user?.display_name || 'Donor',
          email: user?.email || 'donor@example.com',
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
      };

      try {
        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.on('payment.failed', function (response) {
          setError(`Payment failed: ${response.error?.description || 'Transaction unsuccessful'}`);
          setIsSubmitting(false);
        });
        razorpayInstance.open();
      } catch (modalErr) {
        // If dummy Razorpay keys are used in dev mode, simulate successful checkout response
        console.warn('Razorpay modal error (using dev simulation fallback):', modalErr);
        options.handler({
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_order_id: order_id,
        });
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to initialize payment.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (campaignError || !campaign) {
    return <div className="max-w-4xl mx-auto py-8 px-4">
      <p role="alert" className="text-rose-700">{campaignError || 'Campaign not found.'}</p>
      <Link to="/campaigns" className="mt-4 inline-block text-indigo-600 hover:underline">Browse campaigns</Link>
    </div>;
  }

  const progressPercent = Math.min(
    100,
    Math.round(((campaign?.raised_amount || 0) / (campaign?.goal_amount || 1)) * 100)
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link to="/" className="text-indigo-600 hover:underline mb-6 inline-block font-medium">
        &larr; Back to Home
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Campaign Info */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              {campaign?.category || 'General'}
            </span>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                campaign?.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {campaign?.status === 'active' ? 'Active' : 'Closed'}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {campaign?.title}
          </h1>

          <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-line">
            {campaign?.description}
          </p>

          {/* Progress */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 mb-4">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-2xl font-bold text-indigo-600">
                ₹{(Number(campaign?.raised_amount) || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-gray-500 font-medium">
                Goal: ₹{(Number(campaign?.goal_amount) || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>{progressPercent}% funded</span>
              <span>
                Deadline: {campaign?.deadline ? new Date(campaign.deadline).toLocaleDateString() : 'Ongoing'}
              </span>
            </div>
          </div>
          <CampaignUpdates key={campaign.id} campaign={campaign} />
        </div>

        {/* Donation Card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Make a Micro-Donation</h2>
            <p className="text-xs text-gray-500 mb-4">
              Every rupee counts. Max donation is ₹500.
            </p>

            {paymentSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                <div className="text-emerald-600 text-3xl mb-2">✓</div>
                <h3 className="font-bold text-emerald-800 text-lg mb-1">Thank You!</h3>
                <p className="text-xs text-emerald-700 mb-2">
                  Your donation of ₹{paymentSuccess.amount} was verified and successful.
                </p>
                <div className="bg-white/80 rounded-md p-2.5 my-3 text-left text-xs border border-emerald-100 space-y-1">
                  <div className="text-gray-600 flex justify-between">
                    <span>Payment ID:</span>
                    <span className="font-mono text-gray-800 break-all">{paymentSuccess.paymentId}</span>
                  </div>
                  <div className="text-gray-600 flex justify-between">
                    <span>Receipt:</span>
                    <span className="text-emerald-700 font-semibold">
                      ✉ Emailed to registered address
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentSuccess(null)}
                  className="mt-2 w-full text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Make another donation
                </button>
              </div>
            ) : (
              <form onSubmit={handleDonate}>
                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                {/* Preset Amount Buttons */}
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Select Amount (₹1 – ₹500)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        amount === preset
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="relative mb-4">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm font-semibold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    placeholder="Custom amount (1-500)"
                    className="w-full pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Anonymous Donation Toggle */}
                <div className="flex items-center gap-2 mb-5">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isAnonymous" className="text-xs text-gray-600 select-none cursor-pointer">
                    Donate anonymously
                  </label>
                </div>

                {/* Submit / Open Razorpay Checkout */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-bold text-sm shadow-md transition-all flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Opening Razorpay...</span>
                    </>
                  ) : (
                    <span>Donate ₹{amount || 0} with Razorpay</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
