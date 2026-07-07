import mongoose, { Schema, type Document } from "mongoose";

export interface IAiAutoPostSettings extends Document {
    apiUrl: string;
    apiKey: string;
    aiModel: string;
    googleApiKey: string;
    googleSearchEngineId: string;
    youtubeApiKey: string;
    createdAt: Date;
    updatedAt: Date;
}

const AiAutoPostSettingsSchema = new Schema<IAiAutoPostSettings>(
    {
        apiUrl:               { type: String, default: "" },
        apiKey:               { type: String, default: "" },
        aiModel:              { type: String, default: "gpt-4o" },
        googleApiKey:         { type: String, default: "" },
        googleSearchEngineId: { type: String, default: "" },
        youtubeApiKey:        { type: String, default: "" },
    },
    { timestamps: true }
);

export default (mongoose.models.AiAutoPostSettings as mongoose.Model<IAiAutoPostSettings>) ||
    mongoose.model<IAiAutoPostSettings>("AiAutoPostSettings", AiAutoPostSettingsSchema);
