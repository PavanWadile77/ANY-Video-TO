import React, { useState, useEffect } from 'react';
import {
  Coins,
  History,
  TrendingDown,
  TrendingUp,
  Clock,
  Sparkles,
  Check,
  Zap,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { api, CreditsResponse } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';

export const Credits: React.FC = () => {
  const [data, setData] = useState<CreditsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    try {
      const res = await api.getCredits();
      setData(res);
    } catch (err) {
      console.error('Failed to load credit ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const PLANS = [
    {
      id: 'free',
      name: 'Free Starter',
      price: '$0',
      period: 'forever',
      credits: '100 credits',
      features: [
        'Standard generation speed',
        '720p maximum resolution',
        '3s duration clips',
        'Watermarked previews',
        'Community support'
      ],
      popular: false
    },
    {
      id: 'creator',
      name: 'Creator',
      price: '$29',
      period: 'per month',
      credits: '600 credits / mo',
      features: [
        'Fast GPU queue access',
        '1080p Full HD resolution',
        'Up to 5s duration clips',
        'Commercial usage rights',
        'No watermarks',
        'Standard prompt enhancement'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro Studio',
      price: '$79',
      period: 'per month',
      credits: '2,000 credits / mo',
      features: [
        'Ultra-fast priority processing',
        '1080p & 4K Master resolution',
        'Up to 10s duration clips',
        'Uncapped concurrent jobs',
        '360° product turntable mode',
        'VIP priority rendering queue'
      ],
      popular: true
    },
    {
      id: 'studio',
      name: 'Enterprise Studio',
      price: '$249',
      period: 'per month',
      credits: '7,500 credits / mo',
      features: [
        'Dedicated compute instances',
        'Custom fine-tuned character LoRAs',
        'Private storage bucket with signed URLs',
        'REST API & Webhook access',
        'Dedicated account engineer',
        '99.9% uptime SLA'
      ],
      popular: false
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <Coins className="w-7 h-7 text-amber-400" />
          <span>Usage, Credits & Billing</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Monitor your real-time generative credit ledger, atomic job settlements, and plan entitlements.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Available Balance</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">
              {data?.account?.balance ?? 180}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ready for video jobs</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Reserved in Flight */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reserved In-Flight</p>
            <h3 className="text-3xl font-bold text-foreground mt-1">
              {data?.account?.reservedBalance ?? 0}
            </h3>
            <p className="text-[11px] text-amber-400 mt-0.5">Held during active rendering</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Lifetime Rendered Credits */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lifetime Consumed</p>
            <h3 className="text-3xl font-bold text-foreground mt-1">
              {data?.account?.lifetimeUsed ?? 75}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Settled generation jobs</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/80 text-muted-foreground">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Active Tier */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Tier</p>
            <h3 className="text-2xl font-bold uppercase text-purple-300 mt-1">
              {data?.account?.tier || 'Pro'}
            </h3>
            <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <Check className="w-3 h-3" /> Active Subscription
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Credit Transaction Ledger (Requirement 10) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            <span>Audit Transaction Ledger</span>
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            Immutable Server-Side Log
          </span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground border-b border-border/50 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {data?.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No credit transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  data?.transactions.map((tx) => {
                    const isPositive = tx.amount > 0;
                    const isNeutral = tx.amount === 0;
                    return (
                      <tr key={tx.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.type === 'grant' || tx.type === 'refund'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : tx.type === 'settle'
                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-foreground/90 max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {isNeutral ? (
                            <span className="text-muted-foreground">0</span>
                          ) : isPositive ? (
                            <span className="text-emerald-400">+{tx.amount}</span>
                          ) : (
                            <span className="text-rose-400">{tx.amount}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-foreground font-semibold">
                          {tx.balanceAfter}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-[11px] truncate max-w-[120px]">
                          {tx.referenceId || 'system'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Subscription Plans Matrix */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        <div>
          <h2 className="text-lg font-bold text-foreground">Subscription Plans</h2>
          <p className="text-xs text-muted-foreground">Scale your generative video output with recurring creator allowances</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between space-y-5 transition-all ${
                plan.popular
                  ? 'bg-gradient-to-b from-purple-950/40 to-card border-purple-500/50 shadow-xl shadow-purple-950/20 relative'
                  : 'bg-card/60 border-border/60'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md">
                  Most Popular
                </span>
              )}

              <div className="space-y-3">
                <div>
                  <h3 className="font-bold text-base text-foreground">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-xs font-semibold text-purple-300 mt-1">{plan.credits}</p>
                </div>

                <div className="pt-3 border-t border-border/40 space-y-2">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                  plan.popular
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                    : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border/60'
                }`}
              >
                {data?.account?.tier === plan.id ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
