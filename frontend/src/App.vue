<script setup>
import { computed, ref, watch } from 'vue';

const message = ref('');
const mode = ref('news');
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

  if (typeof payload === 'object' && Array.isArray(payload.articles)) {
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

  if (
    !payload ||
    typeof payload !== 'object' ||
    (Array.isArray(payload.articles) && payload.articles.length >= 0)
  ) {
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

const newsArticles = computed(() => {
  const payload = responsePayload.value;

  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.articles)) {
    return [];
  }

  return payload.articles.map((article, index) => ({
    id: article.url || `${article.title || 'news'}-${index}`,
    title: article.title || '未命名新闻',
    description: article.description || '',
    url: article.url || '',
    source: article.source || '',
    publishedAt: article.publishedAt || '',
  }));
});

const newsSummary = computed(() => {
  const payload = responsePayload.value;

  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.articles)) {
    return '';
  }

  if (payload.articles.length === 0) {
    return '未找到符合条件的新闻。';
  }

  const visibleCount = newsArticles.value.length;
  const total = typeof payload.totalResults === 'number' ? payload.totalResults : visibleCount;

  return `为您找到 ${visibleCount} 条相关新闻（共 ${total} 条结果）。`;
});

function formatNewsDate(timestamp) {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('zh-CN', { hour12: false });
}

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

  if (mode.value === 'news') {
    if (!hasMessage) {
      errorMessage.value = '请输入要查询的新闻关键词。';
      return;
    }
  } else if (mode.value === 'image') {
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
        <h1>智能新闻查询</h1>
        <p>输入关键词，获取来自主流媒体的相关新闻摘要</p>
      </header>

      <form class="chat-form" @submit.prevent="handleSubmit">
        <fieldset class="chat-form__mode" :disabled="isSending">
          <legend class="chat-form__label">功能模式</legend>
          <label class="chat-form__radio">
            <input type="radio" name="mode" value="news" v-model="mode" />
            新闻查询
          </label>
          <label
            class="chat-form__radio chat-form__radio--disabled"
            title="生成文本功能已关闭"
          >
            <input type="radio" name="mode" value="text" v-model="mode" disabled />
            生成文本（已停用）
          </label>
          <label
            class="chat-form__radio chat-form__radio--disabled"
            title="生成图片功能已关闭"
          >
            <input type="radio" name="mode" value="image" v-model="mode" disabled />
            生成图片（已停用）
          </label>
        </fieldset>

        <label class="chat-form__label" for="message">查询关键词</label>
        <textarea
          id="message"
          v-model="message"
          class="chat-form__textarea"
          rows="4"
          placeholder="例如：科技公司财报、世界杯赛事、宏观经济政策"
          :disabled="isSending"
        ></textarea>

        <div class="chat-form__actions">
          <button class="chat-form__submit" type="submit" :disabled="isSending">
            {{ isSending ? '查询中…' : '开始查询' }}
          </button>
        </div>
      </form>

      <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
      <p v-else-if="isSending" class="feedback feedback--status">查询中…</p>

      <section v-if="responsePayload" class="response-panel">
        <h2>查询结果</h2>
        <p v-if="newsSummary" class="response-panel__summary">{{ newsSummary }}</p>
        <ol v-if="newsArticles.length" class="news-results">
          <li v-for="article in newsArticles" :key="article.id" class="news-results__item">
            <h3 class="news-results__title">
              <a
                v-if="article.url"
                :href="article.url"
                class="news-results__link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ article.title }}
              </a>
              <span v-else>{{ article.title }}</span>
            </h3>
            <p v-if="article.description" class="news-results__description">{{ article.description }}</p>
            <p class="news-results__meta">
              <span v-if="article.source">来源：{{ article.source }}</span>
              <span v-if="article.publishedAt">时间：{{ formatNewsDate(article.publishedAt) }}</span>
            </p>
          </li>
        </ol>
        <p v-else-if="formattedResponse" class="response-panel__text">{{ formattedResponse }}</p>
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

.chat-form__mode {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  padding: 1rem;
  border-radius: 12px;
  background: #f8fafc;
}

.chat-form__radio {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #1f2937;
}

.chat-form__radio input {
  accent-color: #6366f1;
}

.chat-form__radio--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.chat-form__radio--disabled input {
  cursor: not-allowed;
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

.response-panel__summary {
  margin: 0;
  font-weight: 600;
  color: #1f2937;
}

.response-panel__text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #1f2937;
}

.news-results {
  list-style: decimal inside;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.news-results__item {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.news-results__title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  color: #111827;
}

.news-results__link {
  color: #2563eb;
  text-decoration: none;
}

.news-results__link:hover {
  text-decoration: underline;
}

.news-results__description {
  margin: 0 0 0.5rem;
  color: #374151;
  line-height: 1.6;
}

.news-results__meta {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
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
