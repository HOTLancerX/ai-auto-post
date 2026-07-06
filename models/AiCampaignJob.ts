import mongoose, { Schema, type Document, type Types } from "mongoose";

/**
 * One job = one keyword from a campaign.
 * status:
 *   "pending"   → waiting for its scheduled time
 *   "done"      → posted successfully
 *   "failed"    → AI call or post save failed (retryable)
 */
export type JobStatus = "pending" | "done" | "failed";

export interface IAiCampaignJob extends Document {
    campaignId: Types.ObjectId;
    keyword: string;
    status: JobStatus;
    postId: Types.ObjectId | null;
    scheduledAt: Date;           // when this job should run
    processedAt: Date | null;    // when it actually ran
    error: string;
    createdAt: Date;
    updatedAt: Date;
}

const AiCampaignJobSchema = new Schema<IAiCampaignJob>(
    {
        campaignId:  { type: Schema.Types.ObjectId, ref: "AiCampaign", required: true, index: true },
        keyword:     { type: String, required: true },
        status:      { type: String, enum: ["pending", "done", "failed"], default: "pending", index: true },
        postId:      { type: Schema.Types.ObjectId, ref: "Post", default: null },
        scheduledAt: { type: Date, required: true, index: true },
        processedAt: { type: Date, default: null },
        error:       { type: String, default: "" },
    },
    { timestamps: true }
);

// Compound: find pending jobs that are due
AiCampaignJobSchema.index({ status: 1, scheduledAt: 1 });

export default (mongoose.models.AiCampaignJob as mongoose.Model<IAiCampaignJob>) ||
    mongoose.model<IAiCampaignJob>("AiCampaignJob", AiCampaignJobSchema);
