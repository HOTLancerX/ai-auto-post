import connectDB from "@/lib/mongodb";
import AiCampaign from "../models/AiCampaign";
import AiCampaignJob from "../models/AiCampaignJob";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import { generateArticle } from "./aiWriter";
import { fetchMedia, buildMediaHtml } from "./mediaFetcher";

function createSlug(title: string): string {
    if (!title) return `ai-post-${Date.now()}`;
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/(^-|-$)/g, "")
        || `ai-post-${Date.now()}`;
}

export interface ProcessResult {
    processed: number;
    posted: number;
    failed: number;
}

/**
 * Called by the cron route every 15 minutes.
 * Picks up all pending jobs whose scheduledAt <= now and processes them.
 */
export async function processDueJobs(): Promise<ProcessResult> {
    await connectDB();

    const now = new Date();

    // Find all pending jobs that are due
    const jobs = await AiCampaignJob.find({
        status: "pending",
        scheduledAt: { $lte: now },
    })
        .sort({ scheduledAt: 1 })
        .lean();

    const result: ProcessResult = { processed: jobs.length, posted: 0, failed: 0 };

    for (const job of jobs) {
        try {
            // Load the parent campaign
            const campaign = await AiCampaign.findById(job.campaignId).lean();
            if (!campaign || !campaign.active) {
                // Campaign deleted or deactivated — mark job as failed
                await AiCampaignJob.findByIdAndUpdate(job._id, {
                    status: "failed",
                    processedAt: now,
                    error: "Campaign not found or inactive",
                });
                result.failed++;
                continue;
            }

            // Generate the article via AI
            const article = await generateArticle(job.keyword, campaign.prompt, campaign.language);

            // Fetch media (images + video) — non-fatal if it fails
            let media = { images: [], videoId: "" };
            try {
                media = await fetchMedia(job.keyword);
            } catch (err) {
                console.warn(`[ai-auto-post] fetchMedia failed for "${job.keyword}":`, err);
            }

            // Append gallery images (2–10) + YouTube video to article content
            const mediaHtml = buildMediaHtml(media.images, media.videoId);
            const fullContent = article.content + mediaHtml;

            // Build a unique slug
            const baseSlug = createSlug(article.title);
            const slugExists = await Post.findOne({ slug: baseSlug }).lean();
            const finalSlug = slugExists ? `${baseSlug}-${Date.now()}` : baseSlug;

            // Create the post
            const newPost = new Post({
                title:    article.title,
                slug:     finalSlug,
                type:     "blog",
                category: campaign.category || null,
                status:   "published",
                userId:   campaign.userId || "",
            });
            await newPost.save();

            const postId = newPost._id;

            // Build SEO data JSON — keys must match seo-meta plugin format
            const seoData = JSON.stringify({
                seo_title:       article.seoTitle,
                seo_description: article.seoDescription,
                seo_keywords:    article.seoKeywords,
                seo_image:       media.images[0] || "",
            });

            // Thumbnail = first image; all images stored in the images array
            const thumbnailImage = media.images[0] || "";

            // Persist PostInfo fields
            const infoEntries = [
                { name: "description",      value: fullContent },
                { name: "shortDescription", value: article.shortDescription },
                { name: "images",           value: JSON.stringify(media.images.length > 0 ? media.images : []) },
                { name: "seo_data",         value: seoData },
            ];

            for (const entry of infoEntries) {
                await PostInfo.findOneAndUpdate(
                    { postId, name: entry.name },
                    { postId, name: entry.name, value: entry.value },
                    { upsert: true }
                );
            }

            // Mark job as done
            await AiCampaignJob.findByIdAndUpdate(job._id, {
                status:      "done",
                postId,
                processedAt: new Date(),
                error:       "",
            });

            result.posted++;
        } catch (err) {
            await AiCampaignJob.findByIdAndUpdate(job._id, {
                status:      "failed",
                processedAt: new Date(),
                error:       err instanceof Error ? err.message : String(err),
            });
            result.failed++;
        }
    }

    return result;
}

/**
 * Create all jobs for a campaign in one shot.
 * Schedules them at intervalMinutes apart starting from now (or all at now if interval = 0).
 */
export async function createJobsForCampaign(campaignId: string): Promise<number> {
    await connectDB();

    const campaign = await AiCampaign.findById(campaignId).lean();
    if (!campaign) throw new Error("Campaign not found");

    // Delete any existing pending jobs for this campaign (re-queue)
    await AiCampaignJob.deleteMany({ campaignId, status: "pending" });

    const now = Date.now();
    const intervalMs = (campaign.intervalMinutes || 0) * 60 * 1000;

    const jobs = campaign.keywords.map((keyword, index) => ({
        campaignId:  campaign._id,
        keyword:     keyword.trim(),
        status:      "pending" as const,
        postId:      null,
        scheduledAt: new Date(now + index * intervalMs),
        processedAt: null,
        error:       "",
    }));

    if (jobs.length > 0) {
        await AiCampaignJob.insertMany(jobs);
    }

    return jobs.length;
}
