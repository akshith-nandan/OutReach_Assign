'use client';
import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { X, Upload, Mail, Clock, ShieldAlert, Send, FileText, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  senders: any[];
}
export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  senders,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsText, setRecipientsText] = useState('');
  const [recipientsList, setRecipientsList] = useState<string[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState(senders[0]?.id || '');
  const [startTime, setStartTime] = useState(
    new Date(Date.now() + 60000).toISOString().slice(0, 16)
  );
  const [delayBetweenSeconds, setDelayBetweenSeconds] = useState(Number(import.meta.env.VITE_DEFAULT_DELAY_SECONDS || 2));
  const [hourlyLimit, setHourlyLimit] = useState(Number(import.meta.env.VITE_DEFAULT_HOURLY_LIMIT || 100));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  useEffect(() => {
    if (!selectedSenderId && senders.length > 0) setSelectedSenderId(senders[0].id);
  }, [selectedSenderId, senders]);
  if (!isOpen) return null;
  const parseEmailString = (text: string) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    const uniqueEmails = Array.from(new Set(matches));
    setRecipientsList(uniqueEmails);
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      complete: (results) => {
        const rawText = JSON.stringify(results.data);
        parseEmailString(rawText);
      },
      error: () => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          parseEmailString(content);
        };
        reader.readAsText(file);
      },
    });
  };
  const handleManualTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRecipientsText(val);
    parseEmailString(val);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!subject.trim()) {
      setErrorMessage('Subject is required.');
      return;
    }
    if (!body.trim()) {
      setErrorMessage('Email body content is required.');
      return;
    }
    if (recipientsList.length === 0) {
      setErrorMessage('At least 1 valid recipient email is required (upload CSV or paste emails).');
      return;
    }
    try {
      setLoading(true);
      const userStr = localStorage.getItem('reachinbox_user');
      const user = userStr ? JSON.parse(userStr) : null;
      await api.post('/emails/schedule', {
        userId: user?.id,
        senderId: selectedSenderId || senders[0]?.id,
        subject: subject.trim(),
        body: body.trim(),
        recipients: recipientsList,
        startTime: new Date(startTime).toISOString(),
        delayBetweenSeconds: Number(delayBetweenSeconds),
        hourlyLimit: Number(hourlyLimit),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to schedule email campaign.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden my-8 transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Compose & Schedule Campaign</h2>
              <p className="text-xs text-gray-500">Queue emails with custom rate limiting & throttling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {/* Sender Select */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              From (Sender Account)
            </label>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
            >
              {senders.length > 0 ? (
                senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email}) — [Ethereal Fake SMTP]
                  </option>
                ))
              ) : (
                <option value="">Default System Sender (Ethereal SMTP)</option>
              )}
            </select>
          </div>
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Subject Line
            </label>
            <input
              type="text"
              placeholder="e.g. Scaling outreach with ReachInbox Email Scheduler"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Email Body
            </label>
            <textarea
              rows={4}
              placeholder="Write your email body template here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none"
            />
          </div>
          {/* Recipients CSV/TXT Upload & Text Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Recipients / Lead List
              </label>
              {recipientsList.length > 0 && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{recipientsList.length} leads detected</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* File Upload Box */}
              <label className="relative border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs font-semibold text-gray-700">
                  {fileName ? fileName : 'Upload CSV / TXT Lead File'}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">Auto parses email addresses</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {/* Paste Text Box */}
              <textarea
                rows={3}
                placeholder="Or paste email leads (comma/line separated)..."
                value={recipientsText}
                onChange={handleManualTextChange}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none"
              />
            </div>
          </div>
          {/* Timing, Rate Limiting & Throttling Options */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                Delay Between Emails (s)
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={delayBetweenSeconds}
                onChange={(e) => setDelayBetweenSeconds(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                Max Hourly Limit
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scheduling Jobs...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Schedule {recipientsList.length} Emails</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
