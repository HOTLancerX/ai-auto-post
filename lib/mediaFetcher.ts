import connectDB from "@/lib/mongodb";
import AiAutoPostSettings from "../models/AiAutoPostSettings";

export interface MediaResult {
    images: string[];   // up to 10 image URLs
    videoId: string;    // YouTube video ID (embed as iframe)
}

/**
 * Fetch up to 10 images from Google Custom Search Image API
 * and 1 YouTube video for the given keyword.
 */
export async function fetchMedia(keyword: string): Promise<MediaResult> {
    await connectDB();
    const doc = await AiAutoPostSettings.findOne().lean();

    const googleApiKey         = doc?.googleApiKey         || "";
    const googleSearchEngineId = doc?.googleSearchEngineId || "";
    const youtubeApiKey        = doc?.youtubeApiKey        || "";

    const [images, videoId] = await Promise.all([
        googleApiKey && googleSearchEngineId
            ? fetchGoogleImages(keyword, googleApiKey, googleSearchEngineId)
            : Promise.resolve([]),
        youtubeApiKey
            ? fetchYouTubeVideo(keyword, youtubeApiKey)
            : Promise.resolve(""),
    ]);

    return { images, videoId };
}

async function fetchGoogleImages(
    keyword: string,
    apiKey: string,
    cx: string
): Promise<string[]> {
    try {
        const params = new URLSearchParams({
            key: apiKey,
            cx,
            q: keyword,
            searchType: "image",
            num: "10",
            safe: "active",
            imgType: "photo",
        });

        const res = await fetch(
            `https://www.googleapis.com/customsearch/v1?${params}`,
            { next: { revalidate: 0 } }
        );

        if (!res.ok) {
            console.error("[ai-auto-post] Google Images API error:", res.status, await res.text());
            return [];
        }

        const data = await res.json();
        const items: any[] = data.items || [];

        return items
            .map((item: any) => item.link as string)
            .filter(Boolean)
            .slice(0, 10);
    } catch (err) {
        console.error("[ai-auto-post] fetchGoogleImages failed:", err);
        return [];
    }
}

async function fetchYouTubeVideo(keyword: string, apiKey: string): Promise<string> {
    try {
        const params = new URLSearchParams({
            key: apiKey,
            q: keyword,
            part: "id",
            type: "video",
            maxResults: "1",
            order: "relevance",
            safeSearch: "moderate",
        });

        const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?${params}`,
            { next: { revalidate: 0 } }
        );

        if (!res.ok) {
            console.error("[ai-auto-post] YouTube API error:", res.status, await res.text());
            return "";
        }

        const data = await res.json();
        const videoId = data.items?.[0]?.id?.videoId || "";
        return videoId;
    } catch (err) {
        console.error("[ai-auto-post] fetchYouTubeVideo failed:", err);
        return "";
    }
}

/**
 * Build an HTML block to append to the article:
 * - Images 2–10 as a responsive grid
 * - YouTube embed iframe
 */
export function buildMediaHtml(images: string[], videoId: string): string {
    let html = "";

    // Gallery: images[1..9] (image[0] is used as thumbnail, not in body)
    const galleryImages = images.slice(1);
    if (galleryImages.length > 0) {
        html += `\n<div class="article-image-gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin:24px 0;">\n`;
        for (const src of galleryImages) {
            html += `  <img src="${src}" alt="" loading="lazy" style="width:100%;height:200px;object-fit:cover;border-radius:8px;" />\n`;
        }
        html += `</div>\n`;
    }

    // YouTube embed
    if (videoId) {
        html += `\n<div class="article-video" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:24px 0;">\n`;
        html += `  <iframe src="https://www.youtube.com/embed/${videoId}" title="Related Video" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>\n`;
        html += `</div>\n`;
    }

    return html;
}
