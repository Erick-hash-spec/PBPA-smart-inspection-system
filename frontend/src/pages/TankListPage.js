import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tankService } from '../services/api';
import { Search, Plus, AlertCircle, Database } from 'lucide-react';

const productColors = {
  crude_oil: 'bg-amber-100 text-amber-800',
  fuel_oil:  'bg-orange-100 text-orange-800',
  diesel:    'bg-yellow-100 text-yellow-800',
  gasoline:  'bg-red-100 text-red-800',
  water:     'bg-blue-100 text-blue-800',
  other:     'bg-gray-100 text-gray-700',
};

export const TankListPage = () => {
  const navigate = useNavigate();
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchTanks(); }, []);

  const fetchTanks = async () => {
    try {
      const res = await tankService.getTanks();
      setTanks(res.data.results || res.data);
    } catch { setError('Failed to load tanks'); }
    finally { setLoading(false); }
  };

  const filtered = tanks.filter(
    (t) => t.tank_name.toLowerCase().includes(search.toLowerCase()) || t.tank_id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tanks</h1>
          <p className="text-gray-500 mt-1">{tanks.length} tank{tanks.length !== 1 ? 's' : ''} registered</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tank name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:bg-white transition"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((tank) => (
            <div
              key={tank.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden cursor-pointer"
              onClick={() => navigate(`/tanks/${tank.id}`)}
            >
              <div className="h-1.5 gradient-primary" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{tank.tank_name}</h2>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{tank.tank_id}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${productColors[tank.product_type] || productColors.other}`}>
                    {tank.product_type?.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-0.5">Capacity</p>
                    <p className="font-semibold text-gray-800">{tank.capacity?.toLocaleString()} L</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-0.5">Location</p>
                    <p className="font-semibold text-gray-800 truncate">{tank.location}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-0.5">Height</p>
                    <p className="font-semibold text-gray-800">{tank.height} m</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-0.5">Diameter</p>
                    <p className="font-semibold text-gray-800">{tank.diameter} m</p>
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/inspections/new?tank=${tank.id}`); }}
                  className="w-full gradient-primary text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition inline-flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> New Inspection
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg">No tanks found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? 'Try a different search term' : 'No tanks have been registered yet'}
          </p>
        </div>
      )}
    </div>
  );
};
