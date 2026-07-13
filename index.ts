import { addHook, type PluginMeta } from "@/hook";
import AiAutoPostSettingsPage from "./settings/AiAutoPostSettingsPage";
import AiCampaignsPage from "./admin/AiCampaignsPage";

export const PLUGINS: PluginMeta = {
    nx: "com.system.ai-auto-post",
    name: "ai-auto-post",
    version: "1.0.0",
    description: "AI-powered bulk article generator. Create campaigns with keyword lists and post SEO-friendly articles automatically on a schedule.",
    author: "System",
    path: "https://github.com/HOTLancerX/ai-auto-post.git",
    icon: "mingcute:pen-ai-line",
    color: "from-violet-500 to-purple-600",
};

export function register() {
    addHook("admin.nav", [
        {
            key: "ai-auto-post",
            label: "AI Auto Post",
            icon: "arcticons:ask-ai",
            slug: "ai-auto-post",
            parent: "",
            position: 26,
        },
        {
            key: "ai-auto-post-settings",
            label: "AI Settings",
            icon: "solar:settings-bold",
            slug: "ai-auto-post/settings",
            parent: "ai-auto-post",
            position: 2,
        },
    ], PLUGINS.nx);

    addHook("admin.pages", [
        {
            key: "ai-auto-post",
            label: "AI Auto Post Campaigns",
            style: "left",
            position: 60,
            path: AiCampaignsPage,
        },
        {
            key: "ai-auto-post/settings",
            label: "AI Auto Post Settings",
            style: "left",
            position: 62,
            path: AiAutoPostSettingsPage,
        },
    ], PLUGINS.nx);
}
