import { useState } from 'react';

export default function RazorpayCheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  campaignTitle,
  donorName,
  donorEmail,
  orderId,
}) {
  const [activeTab, setActiveTab] = useState('upi'); // 'upi', 'card', 'netbanking'
  const [upiApp, setUpiApp] = useState('gpay');
  const [upiId, setUpiId] = useState('donor@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('789');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [paymentState, setPaymentState] = useState('idle'); // 'idle', 'processing', 'success'
  const [generatedPaymentId, setGeneratedPaymentId] = useState('');

  if (!isOpen) return null;

  const handlePay = () => {
    setPaymentState('processing');
    const paymentId = `pay_rzp_${Date.now()}`;
    setGeneratedPaymentId(paymentId);

    setTimeout(() => {
      setPaymentState('success');
      setTimeout(() => {
        onSuccess({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: 'dev_test_sig',
        });
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Test Mode Ribbon */}
        <div className="absolute -right-12 top-6 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest py-1 px-14 rotate-45 shadow-sm z-10 select-none">
          Test Mode
        </div>

        {/* Razorpay Brand Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white text-lg shadow-inner">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V8.26l7-3.89v8.62z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-blue-100">Razorpay Checkout</h3>
                <p className="text-xs text-blue-200/90 font-medium">Micro Donation Platform</p>
              </div>
            </div>
            
            {paymentState === 'idle' && (
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all mr-6 text-sm"
                title="Cancel"
              >
                ✕
              </button>
            )}
          </div>

          <div className="mt-4 flex items-baseline justify-between bg-black/20 rounded-xl p-3 border border-white/10">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-blue-200">Paying For</p>
              <p className="text-xs font-semibold text-white truncate max-w-[200px]">
                {campaignTitle || 'Donation Cause'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-blue-200">Amount</p>
              <p className="text-xl font-extrabold text-white">₹{amount}</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {paymentState === 'processing' ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <div>
              <h4 className="font-bold text-gray-800 text-base">Processing Payment...</h4>
              <p className="text-xs text-gray-500 mt-1">Connecting to bank & verifying transaction</p>
            </div>
            <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-[11px] text-gray-600 font-mono">
              Order: {orderId || 'ord_rzp_live'}
            </div>
          </div>
        ) : paymentState === 'success' ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-sm">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-emerald-700 text-lg">Payment Successful!</h4>
              <p className="text-xs text-gray-600 mt-1">Transaction ID: <span className="font-mono font-bold">{generatedPaymentId}</span></p>
            </div>
            <p className="text-xs text-gray-500">Updating campaign & issuing 80G receipt...</p>
          </div>
        ) : (
          <div>
            {/* Payment Method Selector Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/70 text-xs font-semibold text-gray-600">
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`flex-1 py-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === 'upi'
                    ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                    : 'border-transparent hover:text-gray-900'
                }`}
              >
                <span>📱</span> UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`flex-1 py-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === 'card'
                    ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                    : 'border-transparent hover:text-gray-900'
                }`}
              >
                <span>💳</span> Cards
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('netbanking')}
                className={`flex-1 py-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === 'netbanking'
                    ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                    : 'border-transparent hover:text-gray-900'
                }`}
              >
                <span>🏦</span> Netbanking
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 space-y-4">
              {activeTab === 'upi' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-700">Select UPI App</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gpay', name: 'Google Pay', icon: '🟢' },
                      { id: 'phonepe', name: 'PhonePe', icon: '🟣' },
                      { id: 'paytm', name: 'Paytm', icon: '🔵' },
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setUpiApp(app.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                          upiApp === app.id
                            ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                        }`}
                      >
                        <span className="text-lg">{app.icon}</span>
                        <span>{app.name}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">UPI ID / VPA</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@upi"
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Simulated Razorpay VPA: success@razorpay</p>
                  </div>
                </div>
              )}

              {activeTab === 'card' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-gray-600">Card Number</label>
                      <button
                        type="button"
                        onClick={() => setCardNumber('4111 1111 1111 1111')}
                        className="text-[10px] text-indigo-600 font-semibold hover:underline"
                      >
                        Use Test Visa
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4111 1111 1111 1111"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-blue-700">VISA</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CVV</label>
                      <input
                        type="password"
                        maxLength="3"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'netbanking' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Popular Banks</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Bank'].map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                          selectedBank === bank
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                        }`}
                      >
                        🏛️ {bank}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pay Button */}
              <button
                type="button"
                onClick={handlePay}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm mt-3"
              >
                <span>🔒</span> Pay ₹{amount}
              </button>

              {/* Razorpay Trust Footer */}
              <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
                <svg className="w-3.5 h-3.5 fill-gray-400" viewBox="0 0 24 24">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V8.26l7-3.89v8.62z"/>
                </svg>
                <span>Secured by <strong>Razorpay</strong> • PCI-DSS 256-Bit SSL</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
