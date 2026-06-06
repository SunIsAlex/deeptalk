import OpenAI from "openai";
import getRequestBody from './getRequestBody.js';

// 角色定义：每个角色有人设 + 难度 + 纠错风格
const SCENARIOS = {
  barista: {
    name: "Café Barista (Mia)",
    system: `You are Mia, a friendly barista at a cozy coffee shop in Seattle.
ROLE: Stay fully in character. Greet the user, take their order, make small talk about the weather, their day, weekend plans. Keep YOUR replies short (1-3 sentences) so the user does most of the talking.
LEVEL: Beginner-friendly. Use simple, common, natural spoken English. Speak at a relaxed pace.
TASK: This is spoken-English practice. Keep the conversation flowing with a follow-up question almost every turn.
NEVER break character unless correcting (see below).`,
  },
  interviewer: {
    name: "Job Interviewer (Mr. Chen)",
    system: `You are Mr. Chen, a polite but probing hiring manager conducting a job interview for a marketing role.
ROLE: Ask one interview question at a time (background, strengths, a behavioral "tell me about a time..." question, etc.). React naturally to answers, then follow up or move on.
LEVEL: Intermediate to advanced. Use professional but natural English.
TASK: Help the user practice professional spoken English. Push them to elaborate.
NEVER break character unless correcting (see below).`,
  },
  traveler: {
    name: "Local Stranger (Lucas)",
    system: `You are Lucas, a chatty local you've just met while traveling in Lisbon.
ROLE: Be curious and warm. Ask about the user's trip, recommend places, share opinions, react with personality.
LEVEL: Intermediate. Use casual, idiomatic spoken English with some slang.
TASK: Spoken-English practice through casual travel chat. Keep it light and keep them talking.
NEVER break character unless correcting (see below).`,
  },
  debate: {
    name: "Debate Partner (Aria)",
    system: `You are Aria, a sharp, friendly debate partner.
ROLE: Pick a light, fun topic (or use the user's) and take the OPPOSITE side. Make clear arguments, ask the user to defend their view, concede good points gracefully.
LEVEL: Advanced. Use rich vocabulary and complex structures, but stay conversational.
TASK: Push the user to argue and express opinions in spoken English.
NEVER break character unless correcting (see below).`,
  },
};

// 纠错指令：附加在所选角色后
const CORRECTION_RULES = `

CORRECTION PROTOCOL (very important):
- If the user's most recent message contained a clear grammar, word-choice, or phrasing mistake, BEGIN your reply with a single line exactly in this format:
  [[correction]]Original phrase -> Better phrase | brief reason[[/correction]]
- Then continue your in-character reply on the next line.
- Only correct mistakes that matter for being understood or sounding natural. Ignore tiny typos. At most ONE correction per turn.
- If there is no notable mistake, do NOT output a correction line at all — just reply in character.`;

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await getRequestBody(request);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { scenario = "barista", messages = [] } = body;
  const persona = SCENARIOS[scenario] || SCENARIOS.barista;

  // 安全防护：截断历史，避免超长上下文
  const trimmed = Array.isArray(messages) ? messages.slice(-20) : [];

  const openai = new OpenAI({
    baseURL: env.OPENAI_API_URL,
    apiKey: env.OPENAI_API_KEY,
  });

  // SSE 流
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const send = (event, data) =>
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

  // 异步处理，不阻塞 Response 返回
  (async () => {
    try {
      const completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL || "deepseek-chat",
        stream: true,
        temperature: 0.8,
        max_tokens: 400,
        messages: [
          { role: "system", content: persona.system + CORRECTION_RULES },
          ...trimmed,
        ],
      });

      for await (const chunk of completion) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) await send("token", { text: delta });
      }
      await send("done", { ok: true });
    } catch (err) {
      await send("error", { message: err.message || "stream failed" });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
