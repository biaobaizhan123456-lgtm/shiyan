type ProcessInputResult = {
  title?: string;
  content?: string;
  warning?: string;
  detail?: string;
};

type MergeResult = {
  mergedText?: string;
  warning?: string;
  detail?: string;
};

type EditImageResult = {
  imageData?: string;
  warning?: string;
  detail?: string;
};

const FALLBACK_TITLE = "星尘思绪";
const FALLBACK_CONTENT = "在星际的寂静中，有些信息超越了语言。";

async function postGenerate<T>(payload: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function processInput(type: 'text' | 'voice' | 'image', data: string) {
  const payload = await postGenerate<ProcessInputResult>({
    action: 'processInput',
    type,
    data
  });

  if (payload && typeof payload.title === 'string' && typeof payload.content === 'string') {
    return payload;
  }

  return {
    title: FALLBACK_TITLE,
    content: type === 'text' ? data : FALLBACK_CONTENT
  };
}

// 新增：实时合并灵感的功能
export async function mergePoeticInspirations(userDraft: string, aiSuggestion: string) {
  const payload = await postGenerate<MergeResult>({
    action: 'mergePoeticInspirations',
    userDraft,
    aiSuggestion
  });

  if (payload && typeof payload.mergedText === 'string') {
    return payload.mergedText;
  }

  return `${userDraft} ${aiSuggestion}`;
}

export async function editImageInspiration(originalBase64: string, prompt: string) {
  const payload = await postGenerate<EditImageResult>({
    action: 'editImageInspiration',
    originalBase64,
    prompt
  });

  if (payload && typeof payload.imageData === 'string') {
    return payload.imageData;
  }

  return originalBase64;
}
