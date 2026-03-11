import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface RefineTaskRequest {
    projectOverview: string;
    taskInput: string;
}

interface RefinedTask {
    title: string;
    description: string;
    subtasks: string[];
    estimated_hours: number;
    difficulty_score: number;
    priority: "Low" | "Medium" | "High";
    task_type: "Feature" | "Bug Fix" | "Improvement" | "Refactor";
}

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured. Add it to .env.local." },
                { status: 500 }
            );
        }

        const body: RefineTaskRequest = await req.json();
        const { projectOverview, taskInput } = body;

        if (!taskInput?.trim()) {
            return NextResponse.json(
                { error: "taskInput is required" },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 800,
                // @ts-expect-error: thinkingConfig is not yet in types
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        const prompt = `You are a project manager at a software agency in 2026. Developers use AI tools so tasks take much less time than traditional estimates.

Project: ${projectOverview || "Software project."}

Task: ${taskInput}

Scoring rules:
Priority: "High"=blocks revenue or core function | "Medium"=improves UX, app works without it | "Low"=cosmetic/polish
Difficulty: 1=single CSS/text change | 2=simple bug fix or one component | 3=multi-component feature with state (gallery, modal, navbar) | 4=database+filtering+state together, auth flow, realtime sync, third-party API, infinite scroll, multiple filters from DB | 5=architecture/payment/major refactor
Hours: AI writes code instantly. Count only: review+integrate+debug+test. Max 8hrs. Simple UI=0.5hr, Medium feature=1-2hr, Complex feature=3-5hr, Simple bug=0.5hr, Hard bug=1.5hr.

Return ONLY this JSON, no extra text:
{"title":"max 10 words","description":"2-3 sentences","subtasks":["step1","step2","step3"],"estimated_hours":0,"difficulty_score":0,"priority":"Medium","task_type":"Feature"}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        if (!text) throw new Error("AI returned an empty response");

        console.log("[AI refine-task] Raw response:", text);

        let clean = text;
        if (text.includes("```")) {
            clean = text
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();
        }

        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (jsonMatch) clean = jsonMatch[0];

        let parsed: RefinedTask;
        try {
            parsed = JSON.parse(clean);
        } catch {
            console.error("[AI refine-task] JSON Parse Failed. Raw:", text);
            throw new Error("AI returned malformed JSON. Please try again.");
        }

        if (!parsed.title || !parsed.description || !Array.isArray(parsed.subtasks)) {
            throw new Error("AI response is missing required fields.");
        }

        const response: RefinedTask = {
            title: String(parsed.title || "Untitled Task"),
            description: String(parsed.description || ""),
            subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks.map(String) : [],
            estimated_hours: Number(parsed.estimated_hours) || 2,
            difficulty_score: Math.min(5, Math.max(1, Number(parsed.difficulty_score) || 3)),
            priority: (["Low", "Medium", "High"].includes(parsed.priority)
                ? parsed.priority
                : "Medium") as RefinedTask["priority"],
            task_type: (["Feature", "Bug Fix", "Improvement", "Refactor"].includes(parsed.task_type)
                ? parsed.task_type
                : "Feature") as RefinedTask["task_type"],
        };

        return NextResponse.json(response);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal Server Error";
        console.error("[AI refine-task] Error:", message);
        return NextResponse.json(
            { error: `Refinement Error: ${message}` },
            { status: 500 }
        );
    }
}