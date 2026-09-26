'use client';
import React, { useState, useEffect } from 'react';
import { X, MessageSquare, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import api from '../lib/api';
interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (connected: boolean) => void;
}
export const SlackModal: React.FC<SlackModalProps> = ({ isOpen, onClose, onStatusChange }) => {
  const [channelName, setChannelName] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);
  const checkStatus = async () => {
    try {
      const res = await api.get('/slack/status');
      setConnected(res.data.connected);
      if (res.data.slackConnection?.channelName) {
        setChannelName(res.data.slackConnection.channelName);
      }
      onStatusChange(res.data.connected);
    } catch (e) {
      console.error('Failed to check Slack status:', e);
    }
  };
  if (!isOpen) return null;
  const handleConnect = async () => {
    setMessage(null);
    try {
      setLoading(true);
      const response = await api.get('/slack/oauth/start');
      window.location.assign(response.data.authorizeUrl);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Could not start Slack authorization.' });
    } finally {
      setLoading(false);
    }
  };
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await api.post('/slack/disconnect');
      setConnected(false);
      setChannelName('');
      onStatusChange(false);
      setMessage({ type: 'success', text: 'Slack disconnected.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to disconnect Slack.' });
    } finally {
      setLoading(false);
    }
  };
  const handleSendTestAlert = async () => {
    try {
      setTestLoading(true);
      setMessage(null);
      await api.post('/slack/test', {});
      setMessage({ type: 'success', text: 'Test rate limit alert sent to your Slack channel!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to send Slack test message.' });
    } finally {
      setTestLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Connect Slack Channel</h2>
              <p className="text-xs text-gray-500">Receive instant alerts when sender hourly limits are hit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}
          {connected && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-emerald-900">Slack Integration Active</p>
                  <p className="text-[11px] text-emerald-700">Posting alerts to channel: {channelName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={testLoading}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{testLoading ? 'Testing...' : 'Test Alert'}</span>
              </button>
            </div>
          )}
          <div className="space-y-4">
            {!connected && (
              <p className="text-sm leading-6 text-gray-600">
                Authorize ReachInbox in your Slack workspace to receive a live alert when a sender reaches its hourly limit.
              </p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {connected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-3 py-2 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Disconnect Slack
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center space-x-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                {!connected && (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={loading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Opening Slack...' : 'Authorize Slack'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
