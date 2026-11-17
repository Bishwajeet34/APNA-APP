import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileWarning, Megaphone, Shield, Trash2, XCircle } from 'lucide-react';
import type { AdminLog, Business, LanguageCode, Notice, Report } from '../types/village';
import { apiFetch } from '../utils/api';
import { formatNoticeType } from '../utils/i18n';
import { pickLocalized } from '../utils/villageLogic';

interface AdminStats {
  total_users: number;
  pending_businesses: number;
  approved_businesses: number;
  open_reports: number;
  total_rides: number;
  total_calls: number;
}

interface AdminBusinessRow extends Business {
  owner_name: string;
  owner_phone: string;
}

interface AdminPanelViewProps {
  token: string;
  lang: LanguageCode;
  onDataChanged: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  token,
  lang,
  onDataChanged,
}) => {
  const [tab, setTab] = useState<'approvals' | 'notices' | 'reports' | 'logs'>('approvals');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingList, setPendingList] = useState<AdminBusinessRow[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  // Notice form
  const [noticeTitleHi, setNoticeTitleHi] = useState('');
  const [noticeTitleEn, setNoticeTitleEn] = useState('');
  const [noticeBodyHi, setNoticeBodyHi] = useState('');
  const [noticeBodyEn, setNoticeBodyEn] = useState('');
  const [noticeType, setNoticeType] = useState<'general' | 'panchayat' | 'emergency' | 'power_water' | 'health_camp'>('panchayat');
  const [noticePriority, setNoticePriority] = useState<'normal' | 'urgent'>('normal');
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const loadAll = async () => {
    const [d, p, n, r, l] = await Promise.all([
      apiFetch<AdminStats>('/api/admin/dashboard', { token }),
      apiFetch<AdminBusinessRow[]>('/api/admin/businesses?status=pending', { token }),
      apiFetch<Notice[]>('/api/notices'),
      apiFetch<Report[]>('/api/admin/reports', { token }),
      apiFetch<AdminLog[]>('/api/admin/logs', { token }),
    ]);
    setStats(d);
    setPendingList(p);
    setNotices(n);
    setReports(r);
    setLogs(l);
  };

  useEffect(() => {
    loadAll();
  }, [token]);

  const handleApprove = async (id: string) => {
    await apiFetch(`/api/admin/businesses/${id}/approve`, { method: 'PATCH', token });
    setAdminMessage(lang === 'hi' ? 'व्यवसाय स्वीकृत (Live) हो गया।' : 'Business approved and published live.');
    await loadAll();
    onDataChanged();
  };

  const handleReject = async (id: string) => {
    const reason = rejectReasons[id] || 'Incomplete address or contact information';
    await apiFetch(`/api/admin/businesses/${id}/reject`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ reason }),
    });
    setAdminMessage(lang === 'hi' ? 'व्यवसाय अस्वीकृत किया गया।' : 'Business rejected.');
    await loadAll();
    onDataChanged();
  };

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/notices', {
      method: 'POST',
      token,
      body: JSON.stringify({
        title_hi: noticeTitleHi,
        title_en: noticeTitleEn || noticeTitleHi,
        body_hi: noticeBodyHi,
        body_en: noticeBodyEn || noticeBodyHi,
        notice_type: noticeType,
        priority: noticePriority,
      }),
    });
    setNoticeTitleHi('');
    setNoticeTitleEn('');
    setNoticeBodyHi('');
    setNoticeBodyEn('');
    setAdminMessage(lang === 'hi' ? 'सूचना प्रकाशित हो गई!' : 'Village notice published!');
    await loadAll();
    onDataChanged();
  };

  const handleArchiveNotice = async (id: string) => {
    await apiFetch(`/api/admin/notices/${id}`, { method: 'DELETE', token });
    await loadAll();
    onDataChanged();
  };

  const handleResolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    await apiFetch(`/api/admin/reports/${id}/resolve`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status, resolution_note: status === 'resolved' ? 'Verified and updated' : 'Dismissed' }),
    });
    await loadAll();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900">
          {lang === 'hi' ? 'एडमिन नियंत्रण केंद्र' : 'Admin Control Center'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {lang === 'hi'
            ? 'दुकानों/ड्राइवरों को मंजूरी दें, गाँव की सूचनाएं जारी करें और शिकायतें सुलझाएं।'
            : 'Approve pending shops and drivers, publish village notices, and review reports.'}
        </p>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            {lang === 'hi' ? 'लंबित मंजूरी (Pending)' : 'Pending Approvals'}
          </p>
          <p className="font-mono-nums mt-1 text-2xl font-bold text-amber-700">
            {stats?.pending_businesses ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            {lang === 'hi' ? 'लाइव दुकानें / सेवाएं' : 'Live Businesses'}
          </p>
          <p className="font-mono-nums mt-1 text-2xl font-bold text-emerald-700">
            {stats?.approved_businesses ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            {lang === 'hi' ? 'कुल पंजीकृत उपयोगकर्ता' : 'Registered Users'}
          </p>
          <p className="font-mono-nums mt-1 text-2xl font-bold text-slate-900">
            {stats?.total_users ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            {lang === 'hi' ? 'राइड्स और कॉल लॉग' : 'Rides · Open Reports'}
          </p>
          <p className="font-mono-nums mt-1 text-2xl font-bold text-slate-900">
            {stats?.total_rides ?? 0} <span className="text-sm font-normal text-slate-500">· {stats?.open_reports ?? 0} open</span>
          </p>
        </div>
      </div>

      {adminMessage && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {adminMessage}
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('approvals')}
          className={`min-h-[42px] rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            tab === 'approvals' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'hi' ? `मंजूरी (${pendingList.length})` : `Approvals (${pendingList.length})`}
        </button>
        <button
          type="button"
          onClick={() => setTab('notices')}
          className={`min-h-[42px] rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            tab === 'notices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'hi' ? 'गाँव सूचनाएं' : 'Village Notices'}
        </button>
        <button
          type="button"
          onClick={() => setTab('reports')}
          className={`min-h-[42px] rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            tab === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'hi' ? `शिकायतें (${reports.filter((r) => r.status === 'open').length})` : `Reports (${reports.filter((r) => r.status === 'open').length})`}
        </button>
        <button
          type="button"
          onClick={() => setTab('logs')}
          className={`min-h-[42px] rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            tab === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'hi' ? 'एडमिन लॉग' : 'Audit Logs'}
        </button>
      </div>

      {/* Tab 1: Approvals */}
      {tab === 'approvals' && (
        <div className="space-y-3">
          {pendingList.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              {lang === 'hi' ? 'कोई लंबित आवेदन नहीं है।' : 'No pending business approvals right now.'}
            </div>
          ) : (
            pendingList.map((biz) => (
              <div key={biz.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-amber-700">
                        {lang === 'hi' ? 'मंजूरी लंबित' : 'Pending Approval'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{biz.owner_name}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums">{biz.owner_phone}</span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {pickLocalized(biz.name_en, biz.name_hi, lang)}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {biz.address_line} {biz.landmark ? `(${biz.landmark})` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(biz.id)}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>{lang === 'hi' ? 'स्वीकृत करें' : 'Approve'}</span>
                    </button>
                    <input
                      type="text"
                      value={rejectReasons[biz.id] || ''}
                      onChange={(e) => setRejectReasons({ ...rejectReasons, [biz.id]: e.target.value })}
                      placeholder={lang === 'hi' ? 'अस्वीकार कारण' : 'Rejection reason'}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleReject(biz.id)}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      <span>{lang === 'hi' ? 'अस्वीकार' : 'Reject'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Notices */}
      {tab === 'notices' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handlePublishNotice} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Megaphone className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>{lang === 'hi' ? 'नई सूचना जारी करें' : 'Publish Village Notice'}</span>
            </h2>
            <input
              type="text"
              required
              value={noticeTitleHi}
              onChange={(e) => setNoticeTitleHi(e.target.value)}
              placeholder="शीर्षक (हिन्दी में)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              required
              value={noticeTitleEn}
              onChange={(e) => setNoticeTitleEn(e.target.value)}
              placeholder="Title (English)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
            <textarea
              rows={2}
              required
              value={noticeBodyHi}
              onChange={(e) => setNoticeBodyHi(e.target.value)}
              placeholder="पूरा संदेश (हिन्दी में)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
            <textarea
              rows={2}
              required
              value={noticeBodyEn}
              onChange={(e) => setNoticeBodyEn(e.target.value)}
              placeholder="Full message (English)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value as typeof noticeType)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold"
              >
                <option value="panchayat">Panchayat</option>
                <option value="health_camp">Health Camp</option>
                <option value="power_water">Power / Water</option>
                <option value="emergency">Emergency</option>
                <option value="general">General</option>
              </select>
              <select
                value={noticePriority}
                onChange={(e) => setNoticePriority(e.target.value as typeof noticePriority)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold"
              >
                <option value="normal">Normal Priority</option>
                <option value="urgent">Urgent Alert</option>
              </select>
            </div>
            <button
              type="submit"
              className="min-h-[44px] w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {lang === 'hi' ? 'सूचना पोस्ट करें' : 'Publish Notice'}
            </button>
          </form>

          <div className="space-y-3">
            {notices.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={n.priority === 'urgent' ? 'font-bold text-red-700' : 'font-semibold text-slate-600'}>
                      {n.priority === 'urgent'
                        ? lang === 'hi'
                          ? 'अति आवश्यक'
                          : 'Urgent'
                        : formatNoticeType(n.notice_type, lang)}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">
                    {pickLocalized(n.title_en, n.title_hi, lang)}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {pickLocalized(n.body_en, n.body_hi, lang)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleArchiveNotice(n.id)}
                  aria-label={`Archive notice ${n.title_en}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Reports */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.map((rep) => (
            <div key={rep.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileWarning className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  <span className="font-semibold text-slate-800">{rep.target_label || rep.target_id}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold uppercase text-emerald-800">{rep.status}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-900">{rep.reason}</p>
                {rep.details && <p className="mt-0.5 text-xs text-slate-600">{rep.details}</p>}
              </div>
              {rep.status === 'open' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleResolveReport(rep.id, 'resolved')}
                    className="min-h-[40px] rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveReport(rep.id, 'dismissed')}
                    className="min-h-[40px] rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {tab === 'logs' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Admin</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="font-mono-nums px-4 py-3 font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.admin_name || log.admin_id}</td>
                  <td className="font-mono-nums px-4 py-3 text-slate-600">
                    {log.entity_type} / {log.entity_id}
                  </td>
                  <td className="font-mono-nums px-4 py-3 text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
