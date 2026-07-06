import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AiCampaign from "@/plugin/ai-auto-post/models/AiCampaign";
import AiCampaignJob from "@/plugin/ai-auto-post/models/AiCampaignJob";
import Cat from "@/models/cat";
import User from "@/models/Users";
import { createJobsForCampaign } from "@/plugin/ai-auto-post/lib/jobProcessor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);

        if (url.searchParams.get("categories") === "true") {
            const cats = await Cat.find({ type: "blog-category", status: "published" })
                .select("_id title").lean();
            return NextResponse.json({ categories: cats.map((c) => ({ _id: String(c._id), title: c.title })) });
        }

        if (url.searchParams.get("users") === "true") {
            const users = await User.find({ status: "active" }).select("_id name").sort({ name: 1 }).lean();
            return NextResponse.json({ users: users.map((u) => ({ _id: String(u._id), name: (u as any).name })) });
        }

        const campaigns = await AiCampaign.find().sort({ createdAt: -1 }).lean();

        // Enrich with category titles
        const catIds = campaigns.map((c) => c.category).filter(Boolean);
        const cats = catIds.length > 0 ? await Cat.find({ _id: { $in: catIds } }).lean() : [];
        const catMap = new Map(cats.map((c) => [String(c._id), c.title]));

        // Job stats per campaign
        const campaignIds = campaigns.map((c) => c._id);
        const jobStats = await AiCampaignJob.aggregate([
            { $match: { campaignId: { $in: campaignIds } } },
            { $group: { _id: "$campaignId", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } } } },
        ]);
        const statsMap = new Map(jobStats.map((s: any) => [String(s._id), s]));

        const enriched = campaigns.map((c) => {
            const stats = statsMap.get(String(c._id)) || { total: 0, done: 0, pending: 0, failed: 0 };
            return {
                ...c,
                _id: String(c._id),
                category: c.category ? String(c.category) : "",
                categoryTitle: c.category ? catMap.get(String(c.category)) || "" : "",
                jobStats: { total: stats.total, done: stats.done, pending: stats.pending, failed: stats.failed },
            };
        });

        return NextResponse.json({ campaigns: enriched });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const { title, category, userId, language, prompt, keywords, intervalMinutes, active } = body;

        if (!title || !keywords?.length) {
            return NextResponse.json({ error: "Title and at least one keyword are required" }, { status: 400 });
        }

        const campaign = await AiCampaign.create({
            title,
            category: category || null,
            userId: userId || "",
            language: language || "en",
            prompt: prompt || "",
            keywords: (keywords as string[]).map((k) => k.trim()).filter(Boolean),
            intervalMinutes: Number(intervalMinutes) || 0,
            active: active !== false,
        });

        // Auto-create jobs immediately
        const jobCount = await createJobsForCampaign(String(campaign._id));

        return NextResponse.json({ campaign, jobCount }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        const body = await req.json();

        // If keywords or intervalMinutes changed, re-queue pending jobs
        const requeue = "keywords" in body || "intervalMinutes" in body;

        const campaign = await AiCampaign.findByIdAndUpdate(id, body, { new: true }).lean();
        if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (requeue && campaign.active) {
            await createJobsForCampaign(id);
        }

        return NextResponse.json({ campaign: { ...campaign, _id: String(campaign._id) } });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        await AiCampaignJob.deleteMany({ campaignId: id });
        await AiCampaign.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
