'use client';
import React from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, ExternalLink, Mail, Send } from 'lucide-react';
interface SentEmailsTableProps {
  emails: any[];
  loading: boolean;
}
export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({ emails, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-gray-500">Loading sent email records...</p>
      </div>
    );
  }
  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Send className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">No Sent Emails Yet</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
          Sent email history will appear here once scheduled jobs execute via Ethereal fake SMTP.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <th className="py-3.5 px-5">Recipient Email</th>
              <th className="py-3.5 px-5">Subject</th>
              <th className="py-3.5 px-5">Sent Date & Time</th>
              <th className="py-3.5 px-5">Status</th>
              <th className="py-3.5 px-5 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {emails.map((job) => {
              const isSent = job.status === 'SENT';
              const formattedDate = job.sentAt
                ? format(new Date(job.sentAt), 'MMM dd, yyyy · hh:mm:ss a')
                : job.scheduledAt
                ? format(new Date(job.scheduledAt), 'MMM dd, yyyy · hh:mm:ss a')
                : '-';
              return (
                <tr key={job.id} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-gray-900">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{job.recipientEmail}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-gray-700 max-w-xs truncate font-medium">
                    {job.subject}
                  </td>
                  <td className="py-3.5 px-5 text-gray-600 font-mono text-[11px]">
                    {formattedDate}
                  </td>
                  <td className="py-3.5 px-5">
                    {isSent ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200/60">
                        <XCircle className="w-3 h-3 text-red-600" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {job.etherealUrl ? (
                      <a
                        href={job.etherealUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <span>View Preview</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-gray-400 text-[11px] italic">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
