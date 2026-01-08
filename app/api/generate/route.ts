import { NextResponse } from 'next/server';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const SYSTEM_PROMPT =
  '你是一个宇宙哲学家。请根据用户的输入（可能是描述图片或语音转义），生成一段充满诗意、简短且具有哲理的关于宇宙、时间或人类意识的片段。字数控制在20字以内。并提供一个具有意境的短标题（4字以内）。返回JSON格式。';

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    content: { type: 'STRING' }
  },
  required: ['title', 'content']
};

const TITLE_ONLY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' }
  },
  required: ['title']
};

const FALLBACK_TITLE = '星尘思绪';
const FALLBACK_CONTENT = '在星际的寂静中，有些信息超越了语言。';
const FALLBACK_TITLE_ONLY = '无名片段';

type GenerateAction =
  | 'processInput'
  | 'mergePoeticInspirations'
  | 'editImageInspiration';

type ProcessInputRequest = {
  action: 'processInput';
  type: 'text' | 'voice' | 'image';
  data: string;
};

type MergeRequest = {
  action: 'mergePoeticInspirations';
  userDraft: string;
  aiSuggestion: string;
};

type EditImageRequest = {
  action: 'editImageInspiration';
  originalBase64: string;
  prompt: string;
};

type RequestPayload = ProcessInputRequest | MergeRequest | EditImageRequest;

async function callGemini(model: string, body: unknown) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 500, json: null as any, warning: 'Missing GEMINI_API_KEY' };
  }

  const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const json = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, json };
}

function getFirstText(json: any): string | null {
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function parseJsonSafe(text: string | null): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function handleProcessInput(payload: ProcessInputRequest) {
  if (payload.type === 'text') {
    const prompt = `用户的文字输入是: "${payload.data}"。请为这段文字生成一个具有意境、简短（4字以内）的短标题。只返回JSON。`;
    const { ok, json } = await callGemini('gemini-3-flash-preview', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: TITLE_ONLY_SCHEMA
      }
    });

    const parsed = parseJsonSafe(getFirstText(json));
    const title = parsed?.title || FALLBACK_TITLE_ONLY;
    return NextResponse.json(
      {
        title,
        content: payload.data,
        warning: ok ? undefined : 'Gemini request failed'
      },
      { status: 200 }
    );
  }

  const contentParts =
    payload.type === 'image'
      ? [
          { text: '请观察这张图片，提取其中的色彩、意境或物体作为灵感。' },
          { inlineData: { mimeType: 'image/jpeg', data: payload.data } }
        ]
      : [
          { text: '请倾听这段语音，将其内容转化为诗意的灵感。' },
          {
            inlineData: {
              mimeType: 'audio/webm',
              data: payload.data.includes('base64,') ? payload.data.split('base64,')[1] : payload.data
            }
          }
        ];

  const { ok, json } = await callGemini('gemini-3-flash-preview', {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: contentParts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA
    }
  });

  const parsed = parseJsonSafe(getFirstText(json));
  const title = parsed?.title || FALLBACK_TITLE;
  const content = parsed?.content || FALLBACK_CONTENT;

  return NextResponse.json(
    {
      title,
      content,
      warning: ok ? undefined : 'Gemini request failed'
    },
    { status: 200 }
  );
}

async function handleMerge(payload: MergeRequest) {
  const prompt = `
用户正在写一段关于宇宙的感悟，当前草稿是: "${payload.userDraft}"
漂浮在空中的灵感片段: "${payload.aiSuggestion}"
请将这两者巧妙地融合在一起，生成一段极其简短、优美、具有高度哲理性的文字。
要求：
1. 字数严格控制在20字以内。
2. 保持用户表达的核心意图，但注入灵感片段的意境。
3. 仅返回融合后的正文，不要有任何多余的话。
`;

  const { ok, json } = await callGemini('gemini-3-flash-preview', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });

  const text = getFirstText(json);
  const mergedText = text ? text.trim().replace(/^"|"$/g, '') : `${payload.userDraft} ${payload.aiSuggestion}`;

  return NextResponse.json(
    {
      mergedText,
      warning: ok ? undefined : 'Gemini request failed'
    },
    { status: 200 }
  );
}

async function handleEditImage(payload: EditImageRequest) {
  const { ok, json } = await callGemini('gemini-2.5-flash-image', {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: payload.originalBase64, mimeType: 'image/jpeg' } },
          {
            text:
              `Edit this image based on the user instruction: "${payload.prompt}". ` +
              'Make sure to maintain the main subject but apply the requested style or modification.'
          }
        ]
      }
    ]
  });

  let imageData: string | null = null;
  const candidates = json?.candidates || [];
  for (const candidate of candidates) {
    for (const part of candidate?.content?.parts || []) {
      if (part?.inlineData?.data) {
        imageData = part.inlineData.data;
        break;
      }
    }
    if (imageData) break;
  }

  return NextResponse.json(
    {
      imageData: imageData || payload.originalBase64,
      warning: ok ? undefined : 'Gemini request failed'
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestPayload | null;
  if (!body || !body.action) {
    return NextResponse.json(
      { title: FALLBACK_TITLE, content: FALLBACK_CONTENT, warning: 'Invalid request' },
      { status: 200 }
    );
  }

  switch (body.action as GenerateAction) {
    case 'processInput':
      return handleProcessInput(body as ProcessInputRequest);
    case 'mergePoeticInspirations':
      return handleMerge(body as MergeRequest);
    case 'editImageInspiration':
      return handleEditImage(body as EditImageRequest);
    default:
      return NextResponse.json(
        { title: FALLBACK_TITLE, content: FALLBACK_CONTENT, warning: 'Unknown action' },
        { status: 200 }
      );
  }
}
