'use client';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, LogOut, MessageSquare, ExternalLink, Activity } from 'lucide-react';
interface HeaderProps {
  onOpenSlackModal: () => void;
  slackConnected: boolean;
}
export const Header: React.FC<HeaderProps> = ({ onOpenSlackModal, slackConnected }) => {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">ReachInbox</h1>
            <p className="text-xs text-gray-500 font-medium">Email Job Scheduler</p>
          </div>
        </div>
        {/* Action Controls & User Info */}
        <div className="flex items-center space-x-4">
          {/* Live BullMQ Queue Monitor */}
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>BullMQ Monitor</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
          </a>
          {/* Slack Connection Button */}
          <button
            onClick={onOpenSlackModal}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              slackConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{slackConnected ? 'Slack Connected' : 'Connect Slack'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                slackConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
          </button>
          {/* User Profile Dropdown */}
          {user && (
            <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                alt={user.name || 'User Avatar'}
                className="w-9 h-9 rounded-full ring-2 ring-blue-500/20 object-cover"
              />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-gray-900">{user.name || 'User'}</p>
                <p className="text-[11px] text-gray-500 truncate max-w-[140px]">{user.email}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
