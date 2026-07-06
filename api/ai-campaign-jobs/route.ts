import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AiCampaignJob from "@/plugin/ai-auto-post/models/AiCampaignJob";
import AiCampaign from "@/plugin/ai-auto-post/models/AiCampaign";
import Post from "@/models/post";
import { createJobsForCampaign } from "@/plugin/ai-auto-post/lib/jobProcessor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);
        const campaignId = url.searchParams.get("campaignId");

        const filter = campaignId ? { campaignId } : {};
        const jobs = await AiCampaignJob.find(filter).sort({ scheduledAt: 1 }).lean();

        // Enrich with post slug
        const postIds = jobs.map((j) => j.postId).filter(Boolean);
        const posts = postIds.length > 0
            ? await Post.find({ _id: { $in: postIds } }).select("_id slug title").lean()
            : [];
        const postMap = new Map(posts.map((p) => [String(p._id), p]));

        const enriched = jobs.map((j) => {
            const post = j.postId ? postMap.get(String(j.postId)) : null;
            return {
                ...j,
                _id: String(j._id),
                campaignId: String(j.campaignId),
                postId: j.postId ? String(j.postId) : null,
                postSlug: (post as any)?.slug || "",
                postTitle: (post as any)?.title || "",
            };
        });

        return NextResponse.json({ jobs: enriched });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);

        // Retry failed jobs for a campaign
        if (url.searchParams.get("retryFailed")) {
            const campaignId = url.searchParams.get("retryFailed");
            await AiCampaignJob.updateMany(
                { campaignId, status: "failed" },
                { status: "pending", processedAt: null, error: "" }
            );
            return NextResponse.json({ success: true });
        }

        // Re-queue all pending for a campaign
        if (url.searchParams.get("requeue")) {
            const campaignId = url.searchParams.get("requeue")!;
            const count = await createJobsForCampaign(campaignId);
            return NextResponse.json({ success: true, queued: count });
        }

        // Delete a single job
        const id = url.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        await AiCampaignJob.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
