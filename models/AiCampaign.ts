import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAiCampaign extends Document {
    title: string;
    category: Types.ObjectId | null;
    userId: string;
    language: string;
    prompt: string;           // Article structure / instructions for AI
    keywords: string[];       // List of keywords — one post per keyword
    intervalMinutes: number;  // 0 = post immediately, N = post every N minutes
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AiCampaignSchema = new Schema<IAiCampaign>(
    {
        title:           { type: String, required: true },
        category:        { type: Schema.Types.ObjectId, ref: "Cat", default: null },
        userId:          { type: String, default: "" },
        language:        { type: String, default: "en" },
        prompt:          { type: String, default: "" },
        keywords:        { type: [String], default: [] },
        intervalMinutes: { type: Number, default: 0 },
        active:          { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default (mongoose.models.AiCampaign as mongoose.Model<IAiCampaign>) ||
    mongoose.model<IAiCampaign>("AiCampaign", AiCampaignSchema);
