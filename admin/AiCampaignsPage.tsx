"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";

const LANGUAGES = [
    { label: "English", value: "en" }, { label: "Bengali", value: "bn" },
    { label: "Hindi",   value: "hi" }, { label: "Arabic",  value: "ar" },
    { label: "Spanish", value: "es" }, { label: "French",  value: "fr" },
    { label: "German",  value: "de" }, { label: "Turkish", value: "tr" },
    { label: "Russian", value: "ru" }, { label: "Japanese",value: "ja" },
    { label: "Chinese", value: "zh" }, { label: "Portuguese",value:"pt"},
];

interface Campaign {
    _id: string;
    title: string;
    category: string;
    categoryTitle: string;
    userId: string;
    language: string;
    prompt: string;
    keywords: string[];
    intervalMinutes: number;
    active: boolean;
    jobStats: { total: number; done: number; pending: number; failed: number };
    createdAt: string;
}

interface Category { _id: string; title: string; }
interface UserItem  { _id: string; name: string; }

export default function AiCampaignsPage() {
    const [campaigns,   setCampaigns]   = useState<Campaign[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [categories,  setCategories]  = useState<Category[]>([]);
    const [users,       setUsers]       = useState<UserItem[]>([]);
    const [showForm,    setShowForm]    = useState(false);
    const [editing,     setEditing]     = useState<Campaign | null>(null);
    const [running,     setRunning]     = useState(false);
    const [runResult,   setRunResult]   = useState<string | null>(null);
    const [expandedId,  setExpandedId]  = useState<string | null>(null);

    useEffect(() => {
        fetchCampaigns();
        fetch("/api/ai-campaigns?categories=true").then((r) => r.json()).then((d) => setCategories(d.categories || []));
        fetch("/api/ai-campaigns?users=true").then((r) => r.json()).then((d) => setUsers(d.users || []));
    }, []);

    const fetchCampaigns = async () => {
        setLoading(true);
        const data = await fetch("/api/ai-campaigns", { cache: "no-store" }).then((r) => r.json());
        setCampaigns(data.campaigns || []);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this campaign and all its queued jobs?")) return;
        await fetch(`/api/ai-campaigns?id=${id}`, { method: "DELETE" });
        fetchCampaigns();
    };

    const handleToggle = async (c: Campaign) => {
        await fetch(`/api/ai-campaigns?id=${c._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: !c.active }),
        });
        fetchCampaigns();
    };

    const handleRunNow = async () => {
        setRunning(true); setRunResult(null);
        const data = await fetch("/api/ai-auto-post-run").then((r) => r.json());
        setRunResult(`Processed: ${data.processed} | Posted: ${data.posted} | Failed: ${data.failed}`);
        setRunning(false);
        fetchCampaigns();
    };

    const handleSave = async (payload: Partial<Campaign>) => {
        if (editing) {
            await fetch(`/api/ai-campaigns?id=${editing._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        } else {
            await fetch("/api/ai-campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        }
        setShowForm(false); setEditing(null);
        fetchCampaigns();
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 text-gray-400">
            <Icon icon="svg-spinners:ring-resize" width={32} />
        </div>
    );

    return (
        <div>
            {/* ── Header ── */}
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-gray-900">AI Auto Post — Campaigns</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Each campaign generates one article per keyword using AI and posts them on a schedule.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 flex gap-2">
                    <button onClick={handleRunNow} disabled={running}
                        className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-55 flex items-center gap-2">
                        {running
                            ? <><Icon icon="svg-spinners:ring-resize" width={16} /> Running…</>
                            : <><Icon icon="solar:play-bold" width={16} /> Run Now</>}
                    </button>
                    <button onClick={() => { setEditing(null); setShowForm(true); }}
                        className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 flex items-center gap-2">
                        <Icon icon="solar:add-circle-bold" width={16} /> New Campaign
                    </button>
                </div>
            </div>

            {runResult && (
                <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex justify-between">
                    <span>{runResult}</span>
                    <button onClick={() => setRunResult(null)} className="text-blue-500 hover:underline text-xs">Dismiss</button>
                </div>
            )}

            {/* ── Campaign cards ── */}
            {campaigns.length === 0 ? (
                <div className="text-center py-24 text-gray-400">
                    <Icon icon="solar:notebook-bold" width={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No campaigns yet.</p>
                    <p className="text-sm">Create one to start auto-generating articles.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {campaigns.map((c) => (
                        <CampaignCard
                            key={c._id} campaign={c}
                            expanded={expandedId === c._id}
                            onToggleExpand={() => setExpandedId(expandedId === c._id ? null : c._id)}
                            onEdit={() => { setEditing(c); setShowForm(true); }}
                            onDelete={() => handleDelete(c._id)}
                            onToggleActive={() => handleToggle(c)}
                        />
                    ))}
                </div>
            )}

            {showForm && (
                <CampaignFormModal
                    campaign={editing}
                    categories={categories}
                    users={users}
                    onClose={() => { setShowForm(false); setEditing(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

/* ── Campaign Card ── */
function CampaignCard({
    campaign, expanded, onToggleExpand, onEdit, onDelete, onToggleActive,
}: {
    campaign: Campaign;
    expanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive: () => void;
}) {
    const s = campaign.jobStats;
    const progress = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;

    return (
        <div className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-all ${!campaign.active ? "opacity-60" : ""}`}>
            <div className="p-5 flex items-start gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Icon icon="solar:robot-bold" width={20} className="text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-base">{campaign.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${campaign.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {campaign.active ? "Active" : "Paused"}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium uppercase">
                            {campaign.language}
                        </span>
                        {campaign.categoryTitle && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                {campaign.categoryTitle}
                            </span>
                        )}
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                            {campaign.intervalMinutes === 0 ? "Immediate" : `Every ${campaign.intervalMinutes}m`}
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{s.done}/{s.total} posted</span>
                            <span>{s.pending} pending · {s.failed > 0 ? <span className="text-red-500">{s.failed} failed</span> : "0 failed"}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all"
                                style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={onToggleExpand}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="View keywords & jobs">
                        <Icon icon={expanded ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} width={16} />
                    </button>
                    <button onClick={onToggleActive}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                        title={campaign.active ? "Pause" : "Resume"}>
                        <Icon icon={campaign.active ? "solar:pause-bold" : "solar:play-bold"} width={16} />
                    </button>
                    <button onClick={onEdit}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="Edit">
                        <Icon icon="solar:pen-bold" width={16} />
                    </button>
                    <button onClick={onDelete}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete">
                        <Icon icon="solar:trash-bin-trash-bold" width={16} />
                    </button>
                </div>
            </div>

            {/* Expanded — keyword jobs list */}
            {expanded && <JobsList campaignId={campaign._id} />}
        </div>
    );
}

/* ── Jobs list (per campaign) ── */
function JobsList({ campaignId }: { campaignId: string }) {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const data = await fetch(`/api/ai-campaign-jobs?campaignId=${campaignId}`, { cache: "no-store" }).then((r) => r.json());
        setJobs(data.jobs || []);
        setLoading(false);
    };

    useEffect(() => { load(); }, [campaignId]);

    const handleRetryFailed = async () => {
        await fetch(`/api/ai-campaign-jobs?retryFailed=${campaignId}`, { method: "DELETE" });
        load();
    };

    const hasFailed = jobs.some((j) => j.status === "failed");

    return (
        <div className="border-t bg-gray-50 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Keywords & Jobs</p>
                {hasFailed && (
                    <button onClick={handleRetryFailed}
                        className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                        <Icon icon="solar:restart-bold" width={12} /> Retry failed
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-4"><Icon icon="svg-spinners:ring-resize" width={20} className="text-gray-400" /></div>
            ) : (
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                    {jobs.map((job) => (
                        <div key={job._id} className="flex items-center gap-3 rounded-lg bg-white border px-3 py-2 text-sm">
                            {/* Status icon */}
                            {job.status === "done"    && <Icon icon="solar:check-circle-bold"    width={16} className="text-emerald-500 shrink-0" />}
                            {job.status === "pending" && <Icon icon="solar:clock-circle-bold"    width={16} className="text-blue-400 shrink-0" />}
                            {job.status === "failed"  && <Icon icon="solar:close-circle-bold"    width={16} className="text-red-500 shrink-0" />}

                            <span className="flex-1 font-medium text-gray-800 truncate">{job.keyword}</span>

                            {job.status === "done" && job.postSlug && (
                                <a href={`/blog/${job.postSlug}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-indigo-600 hover:underline shrink-0">
                                    View post ↗
                                </a>
                            )}

                            {job.status === "pending" && (
                                <span className="text-xs text-gray-400 shrink-0">
                                    {new Date(job.scheduledAt) <= new Date()
                                        ? "Due now"
                                        : `at ${new Date(job.scheduledAt).toLocaleTimeString()}`}
                                </span>
                            )}

                            {job.status === "failed" && (
                                <span className="text-xs text-red-400 truncate max-w-[160px]" title={job.error}>
                                    {job.error?.slice(0, 60)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Campaign Form Modal ── */
function CampaignFormModal({
    campaign, categories, users, onClose, onSave,
}: {
    campaign: Campaign | null;
    categories: Category[];
    users: UserItem[];
    onClose: () => void;
    onSave: (data: any) => void;
}) {
    const [title,           setTitle]           = useState(campaign?.title           || "");
    const [category,        setCategory]        = useState(campaign?.category        || "");
    const [userId,          setUserId]          = useState(campaign?.userId          || "");
    const [language,        setLanguage]        = useState(campaign?.language        || "en");
    const [prompt,          setPrompt]          = useState(campaign?.prompt          || "");
    const [keywordsText,    setKeywordsText]    = useState((campaign?.keywords || []).join("\n"));
    const [intervalMinutes, setIntervalMinutes] = useState(String(campaign?.intervalMinutes ?? 0));
    const [active,          setActive]          = useState(campaign?.active !== false);
    const [saving,          setSaving]          = useState(false);
    const [error,           setError]           = useState("");

    const keywords = keywordsText.split("\n").map((k) => k.trim()).filter(Boolean);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError("Title is required"); return; }
        if (keywords.length === 0) { setError("At least one keyword is required"); return; }
        setSaving(true); setError("");
        await onSave({
            title: title.trim(),
            category: category || undefined,
            userId,
            language,
            prompt,
            keywords,
            intervalMinutes: Number(intervalMinutes) || 0,
            active,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {campaign ? "Edit Campaign" : "New Campaign"}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Configure campaign settings and keywords list</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                        <Icon icon="solar:close-bold" width={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                    )}

                    {/* Campaign title */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-700">Campaign Title *</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                            placeholder="e.g. Sylhet Tech Articles — July 2026"
                            className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500" />
                    </div>

                    {/* Category + User in a row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-700">Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)}
                                className="appearance-none rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500">
                                <option value="">No category</option>
                                {categories.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-700">Post as User</label>
                            <select value={userId} onChange={(e) => setUserId(e.target.value)}
                                className="appearance-none rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500">
                                <option value="">Select user</option>
                                {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Language + Interval */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-700">Language</label>
                            <select value={language} onChange={(e) => setLanguage(e.target.value)}
                                className="appearance-none rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500">
                                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-700">Interval (minutes)</label>
                            <input type="number" min="0" max="10080" value={intervalMinutes}
                                onChange={(e) => setIntervalMinutes(e.target.value)}
                                className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500" />
                            <p className="text-xs text-gray-400">
                                {Number(intervalMinutes) === 0
                                    ? "0 = post all keywords immediately on next run"
                                    : `One keyword posted every ${intervalMinutes} minute(s)`}
                            </p>
                        </div>
                    </div>

                    {/* AI Prompt */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-700">Article Instructions (Prompt)</label>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
                            placeholder={`e.g. Write a detailed, SEO-friendly article with an introduction, 3 main sections with H2 headings, a FAQ section with 5 questions, and a conclusion. Target length: 800–1000 words. Tone: professional but friendly.`}
                            className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 resize-none" />
                        <p className="text-xs text-gray-400">Tell the AI the structure, tone, length, and style of every article in this campaign.</p>
                    </div>

                    {/* Keywords */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-700">Keywords *</label>
                            <span className="text-xs text-gray-400">{keywords.length} keyword{keywords.length !== 1 ? "s" : ""}</span>
                        </div>
                        <textarea value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} rows={8}
                            placeholder={"best restaurants in Sylhet\nhow to learn programming fast\ndigital marketing tips 2026\nseo tricks for beginners"}
                            className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 font-mono resize-none" />
                        <p className="text-xs text-gray-400">One keyword per line. Each keyword generates one full AI article.</p>

                        {/* Preview pills */}
                        {keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                {keywords.map((k, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100">
                                        {k}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active toggle */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div onClick={() => setActive(!active)}
                            className={`relative w-10 h-5.5 rounded-full transition-colors ${active ? "bg-indigo-500" : "bg-gray-200"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${active ? "translate-x-5" : "translate-x-0"}`} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Active — jobs will run on next cron execution</span>
                    </label>

                    {/* Scheduling preview */}
                    {keywords.length > 0 && Number(intervalMinutes) > 0 && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                            <strong>Schedule preview:</strong> {keywords.length} articles will be posted over{" "}
                            {Math.ceil((keywords.length * Number(intervalMinutes)) / 60)} hour(s) —
                            first article posts immediately, last at ~{new Date(Date.now() + keywords.length * Number(intervalMinutes) * 60000).toLocaleTimeString()}.
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-1 border-t">
                        <button type="button" onClick={onClose}
                            className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-55 flex items-center gap-2">
                            {saving
                                ? <><Icon icon="svg-spinners:ring-resize" width={16} /> Saving…</>
                                : <><Icon icon="solar:check-circle-bold" width={16} /> {campaign ? "Save Changes" : "Create Campaign"}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
