import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">Every Rupee Counts 💙</h1>
      <p className="text-lg text-gray-500 mb-8">Donate ₹1 to ₹500 to causes that matter.</p>
      <Link to="/campaigns" className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-indigo-700">
        Browse Campaigns
      </Link>
    </div>
  );
}
