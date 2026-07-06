import connectDB from "@/lib/mongodb";
import AiAutoPostSettings from "../models/AiAutoPostSettings";

export interface AiArticleResult {
    title: string;
    content: string;
    shortDescription: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
}

const LANG_MAP: Record<string, string> = {
    en: "English", bn: "Bengali", hi: "Hindi", ar: "Arabic",
    es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
    tr: "Turkish", ru: "Russian", ja: "Japanese", zh: "Chinese",
};

export async function generateArticle(
    keyword: string,
    prompt: string,
    language: string
): Promise<AiArticleResult> {
    await connectDB();
    const doc = await AiAutoPostSettings.findOne().lean();

    const apiUrl = doc?.apiUrl || "";
    const apiKey = doc?.apiKey || "";
    const model  = doc?.aiModel || "gpt-4o";

    if (!apiUrl || !apiKey) {
        throw new Error("AI Auto Post: API URL and Key are not configured in Settings.");
    }

    const langName = LANG_MAP[language] || language;

    const systemPrompt = `You are an expert SEO blog writer. Always respond with valid JSON only — no markdown fences, no extra text.`;

    const userPrompt = `Write a complete, SEO-optimised blog article in ${langName} about the keyword: "${keyword}".

Additional instructions from the editor:
${prompt || "Write a well-structured, informative article."}

Requirements:
- Title: compelling, keyword-rich, under 70 characters
- Content: full HTML article (use <h2>, <h3>, <p>, <ul>, <li> tags), 600–1200 words, no <html>/<body> wrapper
- Short description: plain text, 150–160 characters, for meta description
- SEO title: under 60 characters
- SEO description: under 160 characters
- SEO keywords: 5–8 comma-separated keywords

Respond ONLY with this JSON (no other text):
{
  "title": "...",
  "content": "...full HTML...",
  "shortDescription": "...",
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "..."
}`;

    const baseUrl = apiUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user",   content: userPrompt },
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API error (${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const raw  = data.choices?.[0]?.message?.content || "";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("AI response did not contain valid JSON. Raw: " + raw.slice(0, 400));
    }

    let result: AiArticleResult;
    try {
        result = JSON.parse(jsonMatch[0]);
    } catch {
        // Try trimming to last closing brace
        const lastBrace = jsonMatch[0].lastIndexOf("}");
        result = JSON.parse(jsonMatch[0].slice(0, lastBrace + 1));
    }

    return {
        title:           result.title           || keyword,
        content:         result.content         || "",
        shortDescription:result.shortDescription|| "",
        seoTitle:        result.seoTitle        || result.title || keyword,
        seoDescription:  result.seoDescription  || result.shortDescription || "",
        seoKeywords:     result.seoKeywords     || keyword,
    };
}
