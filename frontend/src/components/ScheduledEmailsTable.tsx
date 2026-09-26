'use client';
import React from 'react';
import { format } from 'date-fns';
import { Clock, AlertTriangle, Calendar, Mail } from 'lucide-react';
interface ScheduledEmailsTableProps {
  emails: any[];
  loading: boolean;
}
export const ScheduledEmailsTable: React.FC<ScheduledEmailsTableProps> = ({ emails, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-gray-500">Loading scheduled email jobs...</p>
      </div>
    );
  }
  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">No Scheduled Emails</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
          You have no upcoming scheduled email jobs. Click "Compose New Email" to schedule outreach campaigns.
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
              <th className="py-3.5 px-5">Scheduled Send Time</th>
              <th className="py-3.5 px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {emails.map((job) => {
              const isDelayed = job.status === 'RATE_LIMITED_DELAYED';
              const formattedDate = job.scheduledAt
                ? format(new Date(job.scheduledAt), 'MMM dd, yyyy · hh:mm:ss a')
                : 'Pending';
              return (
                <tr key={job.id} className="hover:bg-blue-50/30 transition-colors">
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
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{formattedDate}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    {isDelayed ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Rate-Limited (Delayed)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span>Scheduled</span>
                      </span>
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
