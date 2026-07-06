/**
 * /api/ai-auto-post-run
 * Called by the Vercel cron (and by the admin "Run Now" button).
 * Processes all pending jobs whose scheduledAt <= now.
 */
import { NextRequest, NextResponse } from "next/server";
import { processDueJobs } from "@/plugin/ai-auto-post/lib/jobProcessor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get("authorization");
        if (auth !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const result = await processDueJobs();
        console.log(`[ai-auto-post] processed=${result.processed} posted=${result.posted} failed=${result.failed}`);
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error("[ai-auto-post] fatal:", err);
        return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    }
}
