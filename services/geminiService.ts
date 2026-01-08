
import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_PROMPT = "你是一个宇宙哲学家。请根据用户的输入（可能是描述图片或语音转义），生成一段充满诗意、简短且具有哲理的关于宇宙、时间或人类意识的片段。字数控制在20字以内。并提供一个具有意境的短标题（4字以内）。返回JSON格式。";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    content: { type: Type.STRING }
  },
  required: ["title", "content"]
};

const TITLE_ONLY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING }
  },
  required: ["title"]
};

export async function processInput(type: 'text' | 'voice' | 'image', data: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (type === 'text') {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `用户的文字输入是: "${data}"。请为这段文字生成一个具有意境、简短（4字以内）的短标题。只返回JSON。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: TITLE_ONLY_SCHEMA
      }
    });

    try {
      const result = JSON.parse(response.text);
      return {
        title: result.title || "星尘思绪",
        content: data 
      };
    } catch (e) {
      return {
        title: "无名片段",
        content: data
      };
    }
  }

  let contents: any;
  if (type === 'image') {
    contents = {
      parts: [
        { text: "请观察这张图片，提取其中的色彩、意境或物体作为灵感。" },
        { inlineData: { mimeType: "image/jpeg", data: data } }
      ]
    };
  } else if (type === 'voice') {
    // Ensure we send raw base64 without the Data URL prefix, and use the correct mimeType for browser-recorded audio (webm)
    const cleanData = data.includes('base64,') ? data.split('base64,')[1] : data;
    contents = {
      parts: [
        { text: "请倾听这段语音，将其内容转化为诗意的灵感。" },
        { inlineData: { mimeType: "audio/webm", data: cleanData } }
      ]
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return {
      title: "共鸣信号",
      content: "在星际的寂静中，有些信息超越了语言。"
    };
  }
}

// 新增：实时合并灵感的功能
export async function mergePoeticInspirations(userDraft: string, aiSuggestion: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    用户正在写一段关于宇宙的感悟，当前草稿是: "${userDraft}"。
    漂浮在空中的灵感片段是: "${aiSuggestion}"。
    请将这两者巧妙地融合在一起，生成一段极其简短、优美、具有高度哲理性的文字。
    要求：
    1. 字数严格控制在30字以内。
    2. 保持用户表达的核心意图，但注入灵感片段的意境。
    3. 仅返回融合后的正文，不要有任何多余的话。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text.trim().replace(/^"|"$/g, '');
  } catch (e) {
    return `${userDraft} ${aiSuggestion}`;
  }
}

export async function editImageInspiration(originalBase64: string, prompt: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: originalBase64, mimeType: 'image/jpeg' } },
          { text: `Edit this image based on the user instruction: "${prompt}". Make sure to maintain the main subject but apply the requested style or modification.` }
        ],
      }
    });
    for (const candidate of response.candidates || []) {
        for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }
    }
    throw new Error("No image generated");
  } catch (e) {
    console.error("Image edit failed", e);
    throw e;
  }
}
