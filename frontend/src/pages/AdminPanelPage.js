import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Users, Shield, Database, Bell, Lock, Eye, Zap,
  ChevronRight, ToggleRight, ToggleLeft
} from 'lucide-react';

const SettingCard = ({ icon: Icon, title, description, toggle, onToggle, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex items-center justify-between cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-all ${onClick ? 'hover:border-blue-300 dark:hover:border-blue-600' : ''}`}
  >
    <div className="flex items-start gap-4 flex-1">
      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="ml-4 shrink-0">
      {toggle !== undefined ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="focus:outline-none"
        >
          {toggle ? (
            <ToggleRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-600" />
          )}
        </button>
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600" />
      )}
    </div>
  </div>
);

export const AdminPanelPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    twoFactorAuth: false,
    maintenanceMode: false,
    autoBackup: true,
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      onClick: () => navigate('/users'),
    },
    {
      title: 'System Analytics',
      description: 'View system activities and performance metrics',
      icon: Zap,
      onClick: () => navigate('/system-analytics'),
    },
    {
      title: 'Inspector Roster',
      description: 'Manage inspector schedules and assignments',
      icon: Database,
      onClick: () => navigate('/roster'),
    },
    {
      title: 'Security Settings',
      description: 'Configure security policies and access controls',
      icon: Shield,
      action: 'toggle',
      key: 'twoFactorAuth',
    },
    {
      title: 'Notifications',
      description: 'Manage system-wide notification settings',
      icon: Bell,
      action: 'toggle',
      key: 'emailNotifications',
    },
    {
      title: 'Backup & Recovery',
      description: 'Configure automatic backups and recovery options',
      icon: Database,
      action: 'toggle',
      key: 'autoBackup',
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Manage system settings and configurations</p>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
          <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-semibold text-blue-900 dark:text-blue-100">System Status</p>
          <p className="text-sm text-blue-700 dark:text-blue-200 mt-0.5">All systems operational • Last backup: Today at 02:30 AM</p>
        </div>
        <div className="ml-auto">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Admin Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {adminSections.map((section, idx) => (
          <SettingCard
            key={idx}
            icon={section.icon}
            title={section.title}
            description={section.description}
            toggle={section.action === 'toggle' ? settings[section.key] : undefined}
            onToggle={() => section.key && handleToggle(section.key)}
            onClick={section.onClick}
          />
        ))}
      </div>

      {/* Security Section */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
          Security & Access
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Active Sessions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Current Session</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Windows • Chrome • Active now</p>
                </div>
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">Active</span>
              </div>
              <button className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                View all sessions
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">API Keys</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Manage API keys for integrations and automations</p>
            <button className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Manage API keys →
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">System Maintenance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-all text-left">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Run Diagnostics</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Check system health and performance</p>
          </button>
          <button className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-all text-left">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Clear Cache</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Free up system resources</p>
          </button>
          <button className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-all text-left">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">View Logs</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Access system event logs</p>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-700 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Admin Panel • Version 1.0.0 • Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};
