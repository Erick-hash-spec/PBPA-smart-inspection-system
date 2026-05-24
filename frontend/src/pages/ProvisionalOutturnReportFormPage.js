import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { provisionalOuturnService } from '../services/api';
import { Trash2 } from 'lucide-react';

const PORT_OPTIONS = ['KOJ1', 'KOJ2', 'SBM', 'Mtwara', 'Tanga'];

const PRODUCT_OPTIONS = ['GASOLINE (PMS)', 'GASOIL (AGO)', 'JET A1'];

const TERMINAL_OPTIONS = [
  'TIPER',
  'GAPCO',
  'ORYX',
  'OILCOM',
  'MOIL',
  'WORLD OIL T2',
  'LAKE OIL',
  'MERU',
  'AFROIL',
  'VIVO',
  'HASS',
  'GBP',
  'CAMEL OIL',
  'SAHARA',
  'PUMA',
  'TOTAL',
  'Other (type below)',
];

const ProvisionalOutturnReportFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    vessel_name: '',
    report_date: new Date().toISOString().split('T')[0],
    port: '',
    product: '',
    captain_name: '',
    surveyor_name: '',
    status: 'draft',
    items: [],
  });

  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    terminal_name: '',
    terminal_custom: '',
    ship_volume_m3: 0,
    ship_weight_mt: 0,
    shore_volume_m3: 0,
    shore_weight_mt: 0,
  });

  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    try {
      const data = await provisionalOuturnService.retrieve(id);
      setFormData({
        ...data,
        items: data.items || [],
      });
      setItems(data.items || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load report: ' + err.message);
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddItem = () => {
    const resolvedName = newItem.terminal_name === 'Other (type below)'
      ? newItem.terminal_custom.trim()
      : newItem.terminal_name.trim();

    if (!resolvedName) {
      setError('Please select or enter a terminal name');
      return;
    }
    const item = {
      terminal_name: resolvedName,
      ship_volume_m3: newItem.ship_volume_m3,
      ship_weight_mt: newItem.ship_weight_mt,
      shore_volume_m3: newItem.shore_volume_m3,
      shore_weight_mt: newItem.shore_weight_mt,
      sn: items.length + 1,
    };
    setItems([...items, item]);
    setNewItem({
      terminal_name: '',
      terminal_custom: '',
      ship_volume_m3: 0,
      ship_weight_mt: 0,
      shore_volume_m3: 0,
      shore_weight_mt: 0,
    });
    setError(null);
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: parseFloat(value) || 0,
    };
    setItems(newItems);
  };

  const handleDeleteItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    return {
      ship_volume: items.reduce((sum, item) => sum + (item.ship_volume_m3 || 0), 0).toFixed(3),
      ship_weight: items.reduce((sum, item) => sum + (item.ship_weight_mt || 0), 0).toFixed(3),
      shore_volume: items.reduce((sum, item) => sum + (item.shore_volume_m3 || 0), 0).toFixed(3),
      shore_weight: items.reduce((sum, item) => sum + (item.shore_weight_mt || 0), 0).toFixed(3),
    };
  };

  const calculateDifference = (shore, ship) => {
    return (shore - ship).toFixed(3);
  };

  const calculateDifferencePercent = (shore, ship) => {
    if (ship === 0) return '0.000';
    return ((((shore - ship) / ship) * 100).toFixed(3));
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    if (!formData.vessel_name.trim()) {
      setError('Please enter vessel name');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one terminal/item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        items: items,
      };

      if (isEditing) {
        await provisionalOuturnService.update(id, payload);
      } else {
        await provisionalOuturnService.create(payload);
      }
      navigate('/provisional-outturn-reports');
    } catch (err) {
      setError('Failed to save report: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading report...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          {isEditing ? 'Edit Provisional Outturn Report' : 'New Provisional Outturn Report'}
        </h1>
        <p className="text-gray-600 text-sm mt-1">PBPA Template</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Fields */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vessel Name *
              </label>
              <input
                type="text"
                name="vessel_name"
                value={formData.vessel_name}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter vessel name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Date
              </label>
              <input
                type="date"
                name="report_date"
                value={formData.report_date}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port
              </label>
              <select
                name="port"
                value={formData.port}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">-- Select Port --</option>
                {PORT_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product
              </label>
              <select
                name="product"
                value={formData.product}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">-- Select Product --</option>
                {PRODUCT_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Captain Name
              </label>
              <input
                type="text"
                name="captain_name"
                value={formData.captain_name}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter captain name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surveyor/Inspector Name
              </label>
              <input
                type="text"
                name="surveyor_name"
                value={formData.surveyor_name}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter surveyor name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-amber-700 hover:bg-amber-800 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                {saving ? 'Saving...' : 'Save Report'}
</button>
              <button
                onClick={() => navigate('/provisional-outturn-reports')}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-medium transition"
              >Cancel
</button>
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="lg:col-span-2">
          {/* Add Item Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 mb-6 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4 break-words">Add Terminal/Item</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2 min-w-0">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 break-words">
                  Terminal Name
                </label>
                <select
                  value={newItem.terminal_name}
                  onChange={(e) => setNewItem({ ...newItem, terminal_name: e.target.value, terminal_custom: '' })}
                  className="w-full min-w-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">-- Select Terminal --</option>
                  {TERMINAL_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {newItem.terminal_name === 'Other (type below)' && (
                  <input
                    type="text"
                    value={newItem.terminal_custom}
                    onChange={(e) => setNewItem({ ...newItem, terminal_custom: e.target.value })}
                    className="w-full min-w-0 mt-2 px-4 py-2 border border-amber-400 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    placeholder="Type custom terminal name"
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 break-words">
                  Ship Volume (m3)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={newItem.ship_volume_m3}
                  onChange={(e) =>
                    setNewItem({ ...newItem, ship_volume_m3: parseFloat(e.target.value) })
                  }
                  className="w-full min-w-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 break-words">
                  Ship Weight (MT)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={newItem.ship_weight_mt}
                  onChange={(e) =>
                    setNewItem({ ...newItem, ship_weight_mt: parseFloat(e.target.value) })
                  }
                  className="w-full min-w-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 break-words">
                  Shore Volume (m3)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={newItem.shore_volume_m3}
                  onChange={(e) =>
                    setNewItem({ ...newItem, shore_volume_m3: parseFloat(e.target.value) })
                  }
                  className="w-full min-w-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 break-words">
                  Shore Weight (MT)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={newItem.shore_weight_mt}
                  onChange={(e) =>
                    setNewItem({ ...newItem, shore_weight_mt: parseFloat(e.target.value) })
                  }
                  className="w-full min-w-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleAddItem}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              + Add Item
</button>
          </div>

          {/* Summary Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white break-words">Summary Table</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-amber-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Terminal/Item</th>
                    <th colSpan="2" className="px-4 py-3 text-center font-semibold border-l border-amber-600">
                      Ship Figures
                    </th>
                    <th colSpan="2" className="px-4 py-3 text-center font-semibold border-l border-amber-600">
                      Shore Figures
                    </th>
                    <th colSpan="3" className="px-4 py-3 text-center font-semibold border-l border-amber-600">
                      Difference
                    </th>
                    <th className="px-4 py-3 text-center font-semibold border-l border-amber-600 w-20">
                      Actions
                    </th>
                  </tr>
                  <tr className="bg-amber-600 text-white">
                    <th className="px-4 py-2 text-left text-xs"></th>
                    <th className="px-4 py-2 text-center text-xs border-l-2 border-white">Vol (m³)</th>
                    <th className="px-4 py-2 text-center text-xs">Wgt (MT)</th>
                    <th className="px-4 py-2 text-center text-xs border-l-2 border-white">Vol (m³)</th>
                    <th className="px-4 py-2 text-center text-xs">Wgt (MT)</th>
                    <th className="px-4 py-2 text-center text-xs border-l-2 border-white">Vol (m³)</th>
                    <th className="px-4 py-2 text-center text-xs">Wgt (MT)</th>
                    <th className="px-4 py-2 text-center text-xs">%</th>
                    <th className="px-4 py-2 text-center text-xs border-l-2 border-white"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const diffVol = calculateDifference(item.shore_volume_m3, item.ship_volume_m3);
                    const diffWgt = calculateDifference(item.shore_weight_mt, item.ship_weight_mt);
                    const diffPct = calculateDifferencePercent(item.shore_volume_m3, item.ship_volume_m3);

                    return (
                      <tr
                        key={idx}
                        className={`border-t border-gray-200 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-blue-50`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">
                          <select
                            value={TERMINAL_OPTIONS.includes(item.terminal_name) ? item.terminal_name : 'Other (type below)'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val !== 'Other (type below)') {
                                const newItems = [...items];
                                newItems[idx] = { ...newItems[idx], terminal_name: val };
                                setItems(newItems);
                              }
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 mb-1"
                          >
                            <option value="">-- Select --</option>
                            {TERMINAL_OPTIONS.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          {(!TERMINAL_OPTIONS.includes(item.terminal_name) || item.terminal_name === 'Other (type below)') && (
                            <input
                              type="text"
                              value={item.terminal_name === 'Other (type below)' ? '' : item.terminal_name}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx] = { ...newItems[idx], terminal_name: e.target.value };
                                setItems(newItems);
                              }}
                              className="w-full px-2 py-1 border border-amber-400 rounded focus:ring-2 focus:ring-amber-500"
                              placeholder="Custom terminal name"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center border-l-2 border-gray-400">
                          <input
                            type="number"
                            step="0.001"
                            value={item.ship_volume_m3}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'ship_volume_m3', e.target.value)
                            }
                            className="w-full px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            step="0.001"
                            value={item.ship_weight_mt}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'ship_weight_mt', e.target.value)
                            }
                            className="w-full px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center border-l-2 border-gray-400">
                          <input
                            type="number"
                            step="0.001"
                            value={item.shore_volume_m3}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'shore_volume_m3', e.target.value)
                            }
                            className="w-full px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            step="0.001"
                            value={item.shore_weight_mt}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'shore_weight_mt', e.target.value)
                            }
                            className="w-full px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center border-l-2 border-gray-400 bg-blue-50 font-semibold">
                          {diffVol}
                        </td>
                        <td className="px-4 py-3 text-center bg-blue-50 font-semibold">
                          {diffWgt}
                        </td>
                        <td className="px-4 py-3 text-center bg-blue-50 font-semibold">
                          {diffPct}%
                        </td>
                        <td className="px-4 py-3 text-center border-l-2 border-gray-400">
                          <button
                            onClick={() => handleDeleteItem(idx)}
                            title="Delete row"
                            className="inline-flex items-center justify-center text-red-600 hover:text-red-700 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals Row */}
                  <tr className="bg-gray-200 font-bold border-t-2 border-gray-400">
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-center border-l-2 border-gray-400">
                      {totals.ship_volume}
                    </td>
                    <td className="px-4 py-3 text-center">{totals.ship_weight}</td>
                    <td className="px-4 py-3 text-center border-l-2 border-gray-400">
                      {totals.shore_volume}
                    </td>
                    <td className="px-4 py-3 text-center">{totals.shore_weight}</td>
                    <td className="px-4 py-3 text-center border-l-2 border-gray-400 bg-blue-100">
                      {calculateDifference(parseFloat(totals.shore_volume), parseFloat(totals.ship_volume))}
                    </td>
                    <td className="px-4 py-3 text-center bg-blue-100">
                      {calculateDifference(parseFloat(totals.shore_weight), parseFloat(totals.ship_weight))}
                    </td>
                    <td className="px-4 py-3 text-center bg-blue-100">
                      {calculateDifferencePercent(parseFloat(totals.shore_volume), parseFloat(totals.ship_volume))}%
                    </td>
                    <td className="px-4 py-3 text-center border-l-2 border-gray-400"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvisionalOutturnReportFormPage;
