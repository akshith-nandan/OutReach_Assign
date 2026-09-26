'use client';
import React from 'react';
import { Calendar, Send, Clock, Server } from 'lucide-react';
interface StatsBarProps {
  scheduledCount: number;
  sentCount: number;
  delayedCount: number;
  sendersCount: number;
}
export const StatsBar: React.FC<StatsBarProps> = ({
  scheduledCount,
  sentCount,
  delayedCount,
  sendersCount,
}) => {
  const cards = [
    {
      title: 'Scheduled Emails',
      value: scheduledCount,
      icon: Calendar,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    {
      title: 'Emails Sent',
      value: sentCount,
      icon: Send,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
    },
    {
      title: 'Rate-Limited / Delayed',
      value: delayedCount,
      icon: Clock,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgLight: 'bg-amber-50',
    },
    {
      title: 'Active Sender Transports',
      value: sendersCount,
      icon: Server,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgLight: 'bg-purple-50',
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {card.title}
              </p>
              <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-xl ${card.bgLight} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${card.textColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};