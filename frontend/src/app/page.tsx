'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { StatsBar } from '../components/StatsBar';
import { ScheduledEmailsTable } from '../components/ScheduledEmailsTable';
import { SentEmailsTable } from '../components/SentEmailsTable';
import { ComposeModal } from '../components/ComposeModal';
import { SlackModal } from '../components/SlackModal';
import { Search, Plus, RefreshCw, Calendar, Send, Sparkles } from 'lucide-react';
import api from '../lib/api';
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [senders, setSenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [user, authLoading]);
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [schedRes, sentRes, sendersRes, slackRes] = await Promise.all([
        api.get('/emails/scheduled'),
        api.get('/emails/sent'),
        api.get('/senders'),
        api.get('/slack/status'),
      ]);
      setScheduledEmails(schedRes.data.scheduledEmails || []);
      setSentEmails(sentRes.data.sentEmails || []);
      setSenders(sendersRes.data.senders || []);
      setSlackConnected(slackRes.data.connected || false);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  // Debounced search handling via Elasticsearch API
  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get(`/emails/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const hits = res.data.results || [];
        if (activeTab === 'scheduled') {
          setScheduledEmails(
            hits.filter((item: any) =>
              ['SCHEDULED', 'QUEUED', 'RATE_LIMITED_DELAYED'].includes(item.status)
            )
          );
        } else {
          setSentEmails(
            hits.filter((item: any) => ['SENT', 'FAILED'].includes(item.status))
          );
        }
      } catch (err) {
        console.error('Search query error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, fetchData]);
  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  const delayedCount = scheduledEmails.filter((e) => e.status === 'RATE_LIMITED_DELAYED').length;
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        onOpenSlackModal={() => setIsSlackOpen(true)}
        slackConnected={slackConnected}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Metric Summary Cards */}
        <StatsBar
          scheduledCount={scheduledEmails.length}
          sentCount={sentEmails.length}
          delayedCount={delayedCount}
          sendersCount={senders.length}
        />
        {/* Action Header & Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Scheduled Emails ({scheduledEmails.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'sent'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sent Emails ({sentEmails.length})</span>
            </button>
          </div>
          {/* Search & Compose Controls */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search via Elasticsearch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
              {isSearching && (
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
            {/* Refresh Button */}
            <button
              onClick={fetchData}
              title="Refresh Data"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {/* Primary Action */}
            <button
              onClick={() => setIsComposeOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Compose New Email</span>
            </button>
          </div>
        </div>
        {/* Data Tables */}
        {activeTab === 'scheduled' ? (
          <ScheduledEmailsTable emails={scheduledEmails} loading={loading} />
        ) : (
          <SentEmailsTable emails={sentEmails} loading={loading} />
        )}
      </main>
      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchData}
        senders={senders}
      />
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        onStatusChange={(connected) => setSlackConnected(connected)}
      />
    </div>
  );
}
