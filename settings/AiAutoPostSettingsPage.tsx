"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

const LANGUAGES = [
    { label: "English",    value: "en" }, { label: "Bengali",    value: "bn" },
    { label: "Hindi",      value: "hi" }, { label: "Arabic",     value: "ar" },
    { label: "Spanish",    value: "es" }, { label: "French",     value: "fr" },
    { label: "German",     value: "de" }, { label: "Portuguese", value: "pt" },
    { label: "Turkish",    value: "tr" }, { label: "Russian",    value: "ru" },
    { label: "Japanese",   value: "ja" }, { label: "Chinese",    value: "zh" },
];

export default function AiAutoPostSettingsPage() {
    const [apiUrl,               setApiUrl]               = useState("");
    const [apiKey,               setApiKey]               = useState("");
    const [aiModel,              setAiModel]              = useState("gpt-4o");
    const [googleApiKey,         setGoogleApiKey]         = useState("");
    const [googleSearchEngineId, setGoogleSearchEngineId] = useState("");
    const [youtubeApiKey,        setYoutubeApiKey]        = useState("");
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/ai-auto-post-settings", { cache: "no-store" })
            .then((r) => r.json())
            .then((d) => {
                if (d.settings) {
                    setApiUrl(d.settings.apiUrl   || "");
                    setApiKey(d.settings.apiKey   || "");
                    setAiModel(d.settings.aiModel || "gpt-4o");
                    setGoogleApiKey(d.settings.googleApiKey || "");
                    setGoogleSearchEngineId(d.settings.googleSearchEngineId || "");
                    setYoutubeApiKey(d.settings.youtubeApiKey || "");
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 4000); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res  = await fetch("/api/ai-auto-post-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiUrl, apiKey, aiModel, googleApiKey, googleSearchEngineId, youtubeApiKey }),
            });
            const data = await res.json();
            flash(res.ok ? "Settings saved!" : `Error: ${data.error}`);
        } catch { flash("Network error"); }
        finally { setSaving(false); }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const res  = await fetch("/api/ai-auto-post-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "test-connection", apiUrl, apiKey, aiModel }),
            });
            const data = await res.json();
            flash(data.success ? "✓ Connection successful!" : `Error: ${data.error}`);
        } catch { flash("Network error"); }
        finally { setTesting(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 text-gray-400">
            <Icon icon="svg-spinners:ring-resize" width={32} />
        </div>
    );

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">AI Auto Post — Settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Configure the OpenAI-compatible API used to generate articles automatically.
                </p>
            </div>

            {message && (
                <div className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium border ${
                    message.startsWith("Error")
                        ? "bg-red-50 text-red-600 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>{message}</div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-5">
                {/* AI Writer API */}
                <div className="bg-white rounded-xl border p-5 flex flex-col gap-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Icon icon="solar:robot-bold" width={18} className="text-violet-600" />
                        AI Writer API (OpenAI-compatible)
                    </h3>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-700">API Base URL</label>
                        <input
                            type="text" value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-400">OpenAI-compatible endpoint (OpenAI, Azure, Groq, local LLMs…)</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-700">API Key</label>
                        <input
                            type="password" value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-700">Model Name</label>
                        <input
                            type="text" value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            placeholder="gpt-4o"
                            className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-400">e.g. gpt-4o, gpt-4-turbo, claude-3-5-sonnet, llama-3</p>
                    </div>
                </div>

                {/* Google Image Search */}
                <div className="bg-white rounded-xl border p-5 flex flex-col gap-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Icon icon="solar:gallery-bold" width={18} className="text-blue-600" />
                        Google Image Search API
                    </h3>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                        <strong>Setup:</strong> Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a> → Enable <strong>Custom Search API</strong> → Create credentials (API Key) → Create a <a href="https://programmablesearchengine.google.com/controlpanel/create" target="_blank" rel="noopener noreferrer" className="underline">Programmable Search Engine</a> and enable "Image Search".
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-700">Google API Key</label>
                        <input
                            type="password" value={googleApiKey}
                            onChange={(e) => setGoogleApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-700">Search Engine ID (CX)</label>
                        <input
                            type="text" value={googleSearchEngineId}
                            onChange={(e) => setGoogleSearchEngineId(e.target.value)}
                            placeholder="e.g. a1b2c3d4e5..."
                            className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-400">Your Custom Search Engine ID (cx parameter)</p>
                    </div>
                </div>

                {/* YouTube Data API */}
                <div className="bg-white rounded-xl border p-5 flex flex-col gap-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Icon icon="solar:videocamera-record-bold" width={18} className="text-red-600" />
                        YouTube Data API v3
                    </h3>
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                        <strong>Setup:</strong> Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a> → Enable <strong>YouTube Data API v3</strong> → Create credentials (API Key).
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-700">YouTube API Key</label>
                        <input
                            type="password" value={youtubeApiKey}
                            onChange={(e) => setYoutubeApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
                    <strong>Cron URL</strong> — add to Vercel or cron-job.org to auto-post on schedule:<br />
                    <code className="mt-1 block bg-white border border-blue-200 rounded px-2 py-1 select-all break-all">
                        {typeof window !== "undefined" ? `${window.location.origin}/api/ai-auto-post-run` : "/api/ai-auto-post-run"}
                    </code>
                    <p className="mt-1 text-blue-500">Runs every 15 minutes automatically on Vercel (see vercel.json).</p>
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={handleTest}
                        disabled={testing || !apiUrl || !apiKey}
                        className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2">
                        {testing
                            ? <><Icon icon="svg-spinners:ring-resize" width={16} /> Testing…</>
                            : <><Icon icon="solar:wifi-bold" width={16} /> Test Connection</>}
                    </button>
                    <button type="submit" disabled={saving}
                        className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 flex items-center gap-2">
                        {saving
                            ? <><Icon icon="svg-spinners:ring-resize" width={16} /> Saving…</>
                            : <><Icon icon="solar:check-circle-bold" width={16} /> Save Settings</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
