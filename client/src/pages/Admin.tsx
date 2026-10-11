import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  Users,
  Film,
  AlertTriangle,
  CheckCircle2,
  Coins,
  RefreshCw,
  PlusCircle,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { api, AdminOverviewResponse, UserProfile, CreditAccount, setCurrentRole } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';

export const Admin: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [users, setUsers] = useState<(UserProfile & { account: CreditAccount })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Credit Adjustment Modal State
  const [adjustUserId, setAdjustUserId] = useState<string>('');
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>('Bonus test credits');
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState<boolean>(false);

  const loadAdminData = async () => {
    setError(null);
    try {
      // Ensure role header is admin for this page
      setCurrentRole('admin');
      const [ov, usrs] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers()
      ]);
      setOverview(ov);
      setUsers(usrs);
      if (usrs.length > 0 && !adjustUserId) {
        setAdjustUserId(usrs[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load admin panel data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId || adjustAmount === 0) return;

    setIsSubmittingAdjust(true);
    setAdjustSuccess(null);
    try {
      const res = await api.adjustCredits(adjustUserId, adjustAmount, adjustReason);
      setAdjustSuccess(`Successfully updated! User new balance: ${res.newBalance} credits.`);
      await loadAdminData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credit adjustment failed');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-amber-400" />
              <span>Platform Administration</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ROLE: ADMIN
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time operations, provider health diagnostics, credit adjustments, and generation job audits.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border/60 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* 1. System Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Users</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">
            {overview?.metrics.totalUsers ?? users.length}
          </h3>
        </div>

        <div className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Jobs</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">
            {overview?.metrics.totalJobs ?? 0}
          </h3>
        </div>

        <div className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Completed Jobs</p>
          <h3 className="text-2xl font-bold text-emerald-400 mt-1">
            {overview?.metrics.completedJobs ?? 0}
          </h3>
        </div>

        <div className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Active Jobs</p>
          <h3 className="text-2xl font-bold text-purple-300 mt-1">
            {overview?.metrics.processingJobs ?? 0}
          </h3>
        </div>

        <div className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Success Rate</p>
          <h3 className="text-2xl font-bold text-sky-400 mt-1">
            {overview?.metrics.successRate ?? 100}%
          </h3>
        </div>
      </div>

      {/* 2. Provider Health Matrix (Requirement 12) */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <span>AI Video Engines & Infrastructure Health</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overview?.providerHealth.map((p) => (
            <div
              key={p.name}
              className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-foreground capitalize">
                  {p.name} Engine
                </span>
                {p.isConfigured ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Unconfigured
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {p.name === 'fal'
                  ? 'Official Fal.ai Queue API (Minimax Hailuo, Kling 1.5, AnimateDiff)'
                  : p.name === 'replicate'
                  ? 'Official Replicate Predictions API (Wan 2.1, Luma Ray)'
                  : 'Animora Sandbox Engine for offline development & mock testing'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Credit Adjustment Tool (Requirement 12) */}
      <div className="p-6 rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-foreground">Manual Credit Adjustments & Auditing</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Grant promotional credits or deduct balances with immutable audit trail notes.
        </p>

        {adjustSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{adjustSuccess}</span>
          </div>
        )}

        <form onSubmit={handleAdjustCredits} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Target User</label>
            <select
              value={adjustUserId}
              onChange={(e) => setAdjustUserId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName} ({u.email}) — Balance: {u.account.balance}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Credit Delta (+ / -)</label>
            <input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
              className="w-full p-2.5 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Audit Reason</label>
            <input
              type="text"
              placeholder="e.g. VIP test grant, refund support ticket"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingAdjust}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
          >
            Apply Adjustment
          </button>
        </form>
      </div>

      {/* 4. Users Directory Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-400" />
          <span>User Accounts & Credit Balances</span>
        </h2>

        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground border-b border-border/50 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Available Balance</th>
                  <th className="py-3 px-4">Reserved</th>
                  <th className="py-3 px-4">Lifetime Used</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-foreground">{u.displayName}</p>
                        <p className="text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-secondary text-muted-foreground'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {u.account.balance}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {u.account.reservedBalance}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {u.account.lifetimeUsed}
                    </td>
                    <td className="py-3 px-4 font-bold uppercase text-purple-300">
                      {u.account.tier}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
