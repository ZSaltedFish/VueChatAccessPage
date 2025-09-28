<script setup>
import { computed, ref, watch } from 'vue';

const message = ref('');
const mode = ref('image');
const imageFile = ref(null);
const fileInputKey = ref(0);
const isSending = ref(false);
const responsePayload = ref(null);
const errorMessage = ref('');

const formattedResponse = computed(() => {
  const payload = responsePayload.value;

  if (!payload) {
    return '';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  const directText = payload.result?.output_text;
  if (directText) {
    return directText;
  }

  const outputItems = Array.isArray(payload.result?.output) ? payload.result.output : [];
  const textSegments = [];

  for (const item of outputItems) {
    const contentEntries = Array.isArray(item?.content) ? item.content : [];

    for (const entry of contentEntries) {
      if (entry?.type === 'output_text') {
        const textValue = entry.text?.value ?? entry.text;
        if (textValue) {
          textSegments.push(textValue);
        }
      }
    }
  }

  if (textSegments.length === 1) {
    return textSegments[0];
  }

  if (textSegments.length > 1) {
    return textSegments.join('\n');
  }

  const fallbackText = payload.result?.output?.[0]?.content?.[0]?.text;
  if (fallbackText) {
    return fallbackText;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    return String(payload);
  }
});

const debugPayload = computed(() => {
  const payload = responsePayload.value;

  if (!payload || typeof payload === 'string') {
    return '';
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    return String(payload);
  }
});

function handleFileChange(event) {
  const [file] = event.target.files || [];
  imageFile.value = file ?? null;
}

const imagePreview = computed(() => {
  const payload = responsePayload.value;

  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const outputItems = Array.isArray(payload.result?.output) ? payload.result.output : [];
  let outputImageBase64 = '';

  for (const item of outputItems) {
    const contentEntries = Array.isArray(item?.content) ? item.content : [];

    for (const entry of contentEntries) {
      if (entry?.type === 'output_image') {
        outputImageBase64 =
          entry.image_base64 ||
          entry.image?.base64 ||
          entry.image?.b64_json ||
          '';
        if (outputImageBase64) {
          break;
        }
      }
    }

    if (outputImageBase64) {
      break;
    }
  }

  const base64Image =
    payload.image?.b64_json ||
    payload.image?.base64 ||
    payload.result?.data?.[0]?.b64_json ||
    outputImageBase64;

  if (!base64Image) {
    return '';
  }

  const mimeType = payload.image?.mime_type || 'image/png';

  return `data:${mimeType};base64,${base64Image}`;
});

watch(
  mode,
  (currentMode) => {
    if (currentMode === 'image' && imageFile.value) {
      imageFile.value = null;
      fileInputKey.value += 1;
    }
  }
);

async function handleSubmit() {
  const trimmedMessage = message.value.trim();
  const hasMessage = trimmedMessage.length > 0;
  const hasImage = Boolean(imageFile.value);

  if (mode.value === 'image') {
    if (!hasMessage) {
      errorMessage.value = '请在图片生成模式下输入提示词。';
      return;
    }
  } else if (!hasMessage && !hasImage) {
    errorMessage.value = '请填写消息或上传一张图像。';
    return;
  }

  isSending.value = true;
  errorMessage.value = '';
  responsePayload.value = null;

  const formData = new FormData();
  formData.append('message', message.value);
  formData.append('mode', mode.value);

  if (imageFile.value) {
    formData.append('images', imageFile.value);
  }

  try {
    const response = await fetch('/api/message', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(details || `请求失败：${response.status}`);
    }

    try {
      const payload = await response.json();
      if (
        payload === null ||
        payload === undefined ||
        (typeof payload === 'string' && payload.trim() === '')
      ) {
        responsePayload.value = '请求成功，但未返回正文。';
      } else {
        responsePayload.value = payload;
      }
    } catch {
      responsePayload.value = '响应不是有效的 JSON。';
    }
    message.value = '';
    imageFile.value = null;
    fileInputKey.value += 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '未知错误，请稍后重试。';
  } finally {
    isSending.value = false;
  }
}
</script>

<template>
  <main class="app-shell">
    <section class="card">
      <header class="card__header">
        <h1>智能生成图片</h1>
        <p>给出图片生成描述，生成一张图片</p>
      </header>

      <form class="chat-form" @submit.prevent="handleSubmit">
        <fieldset class="chat-form__mode" :disabled="isSending">
          <legend class="chat-form__label">生成模式</legend>
          <label class="chat-form__radio chat-form__radio--disabled" title="目前仅支持生成图片">
            <input type="radio" name="mode" value="text" v-model="mode" disabled />
            生成文本
          </label>
          <label class="chat-form__radio">
            <input type="radio" name="mode" value="image" v-model="mode" />
            生成图片
          </label>
        </fieldset>

        <label class="chat-form__label" for="message">对话内容</label>
        <textarea
          id="message"
          v-model="message"
          class="chat-form__textarea"
          rows="5"
          placeholder="请输入要发送的消息"
          :disabled="isSending"
        ></textarea>

        <template v-if="mode === 'text'">
          <label class="chat-form__label" for="image-upload">上传图像（可选）</label>
          <input
            :key="fileInputKey"
            id="image-upload"
            class="chat-form__file"
            type="file"
            accept="image/*"
            @change="handleFileChange"
            :disabled="isSending"
          />
        </template>

        <div class="chat-form__actions">
          <button class="chat-form__submit" type="submit" :disabled="isSending">
            {{ isSending ? '请稍等…' : '发送' }}
          </button>
        </div>
      </form>

      <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
      <p v-else-if="isSending" class="feedback feedback--status">请稍等…</p>

      <section v-if="responsePayload" class="response-panel">
        <h2>后端响应</h2>
        <img v-if="imagePreview" class="response-panel__image" :src="imagePreview" alt="AI 生成图像预览" />
        <p v-if="formattedResponse" class="response-panel__text">{{ formattedResponse }}</p>
        <details v-if="debugPayload" class="response-panel__debug">
          <summary>调试信息</summary>
          <pre>{{ debugPayload }}</pre>
        </details>
      </section>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: radial-gradient(circle at top, #fefefe, #e5ebf3);
}

.card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
  padding: 2rem;
  max-width: 720px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card__header h1 {
  margin: 0;
  font-size: 1.75rem;
}

.card__header p {
  color: #5f6c7b;
  margin: 0.5rem 0 0;
}

.chat-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chat-form__label {
  font-weight: 600;
  color: #334155;
}

.chat-form__textarea {
  resize: vertical;
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 1rem;
  min-height: 120px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.chat-form__textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.chat-form__file {
  display: block;
}

.chat-form__actions {
  display: flex;
  justify-content: flex-end;
}

.chat-form__submit {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  color: #fff;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.chat-form__submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  box-shadow: none;
}

.chat-form__submit:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(99, 102, 241, 0.25);
}

.feedback {
  margin: 0;
  font-size: 0.95rem;
}

.feedback--error {
  color: #dc2626;
}

.feedback--status {
  color: #4f46e5;
}

.response-panel {
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.response-panel__text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #1f2937;
}

.response-panel__debug {
  font-size: 0.875rem;
}

.response-panel__debug summary {
  cursor: pointer;
  color: #475569;
}

.response-panel__debug pre {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #f1f5f9;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
}

@media (max-width: 640px) {
  .card {
    padding: 1.5rem;
  }
}
</style>

.chat-form__radio--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chat-form__radio--disabled input {
  cursor: not-allowed;
}
