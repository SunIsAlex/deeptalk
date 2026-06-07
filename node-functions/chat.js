import OpenAI from "openai";
import getRequestBody from './getRequestBody.js';
import { SCENARIOS, CORRECTION_RULES } from '../scenarios.js';

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

  // 只保留真实对话消息，截断历史
  const raw = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20);

  // 合并连续同角色消息，保证 user/assistant 交替，避免某些接口对连续 user 报错
  const history = [];
  for (const m of raw) {
    const last = history[history.length - 1];
    if (last && last.role === m.role) {
      last.content += "\n" + m.content;
    } else {
      history.push({ role: m.role, content: m.content });
    }
  }

  // 没有任何真实消息 = 开场
  const isOpening = history.length === 0;

  const openingNote = `\n\nThe conversation is just starting. Greet the user warmly in character and ask one opening question. Do NOT correct anything — the user hasn't said anything yet.`;

  const systemPrompt =
    persona.system + (isOpening ? openingNote : CORRECTION_RULES);

  const chatMessages = isOpening
    ? [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Start the conversation." },
      ]
    : [{ role: "system", content: systemPrompt }, ...history];

  const openai = new OpenAI({
    baseURL: env.OPENAI_API_URL,
    apiKey: env.OPENAI_API_KEY,
  });

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event, data) =>
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

  (async () => {
    try {
      const completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL || "deepseek-v4-flash",
        stream: true,
        temperature: 0.8,
        max_tokens: 1024,
        messages: chatMessages,
	thinking: {type: "disabled"}
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
