import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AiAutoPostSettings from "@/plugin/ai-auto-post/models/AiAutoPostSettings";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();
        let doc = await AiAutoPostSettings.findOne().lean();
        if (!doc) doc = (await AiAutoPostSettings.create({})).toObject();
        return NextResponse.json({
            settings: {
                apiUrl:  doc.apiUrl  || "",
                apiKey:  doc.apiKey  || "",
                aiModel: doc.aiModel || "gpt-4o",
            },
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await connectDB();
        const { apiUrl, apiKey, aiModel } = await req.json();
        await AiAutoPostSettings.findOneAndUpdate(
            {},
            { apiUrl: apiUrl || "", apiKey: apiKey || "", aiModel: aiModel || "gpt-4o" },
            { upsert: true }
        );
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { action, apiUrl, apiKey, aiModel } = await req.json();

        if (action === "test-connection") {
            if (!apiUrl || !apiKey) {
                return NextResponse.json({ success: false, error: "API URL and Key are required" });
            }
            const base = apiUrl.replace(/\/+$/, "");
            const res = await fetch(`${base}/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: aiModel || "gpt-4o",
                    messages: [{ role: "user", content: "Hello" }],
                    max_tokens: 5,
                }),
            });
            if (!res.ok) {
                const t = await res.text();
                return NextResponse.json({ success: false, error: `API ${res.status}: ${t.slice(0, 200)}` });
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    }
}
