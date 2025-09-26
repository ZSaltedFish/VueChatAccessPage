<script setup>
import { computed, ref } from 'vue';

const message = ref('');
const imageFile = ref(null);
const fileInputKey = ref(0);
const isSending = ref(false);
const responsePayload = ref(null);
const errorMessage = ref('');

const formattedResponse = computed(() => {
  if (!responsePayload.value) {
    return '';
  }

  if (typeof responsePayload.value === 'string') {
    return responsePayload.value;
  }

  try {
    return JSON.stringify(responsePayload.value, null, 2);
  } catch (error) {
    return String(responsePayload.value);
  }
});

function handleFileChange(event) {
  const [file] = event.target.files || [];
  imageFile.value = file ?? null;
}

async function handleSubmit() {
  if (!message.value && !imageFile.value) {
    errorMessage.value = '请填写消息或上传一张图像。';
    return;
  }

  isSending.value = true;
  errorMessage.value = '';
  responsePayload.value = null;

  const formData = new FormData();
  formData.append('text', message.value);

  if (imageFile.value) {
    formData.append('image', imageFile.value);
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

    const rawPayload = await response.text();
    if (!rawPayload) {
      responsePayload.value = '请求成功，但未返回正文。';
    } else {
      try {
        responsePayload.value = JSON.parse(rawPayload);
      } catch {
        responsePayload.value = rawPayload;
      }
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
        <h1>智能对话演示</h1>
        <p>输入文字并可选上传一张图像，向后端接口 <code>/api/message</code> 发送请求。</p>
      </header>

      <form class="chat-form" @submit.prevent="handleSubmit">
        <label class="chat-form__label" for="message">对话内容</label>
        <textarea
          id="message"
          v-model="message"
          class="chat-form__textarea"
          rows="5"
          placeholder="请输入要发送的消息"
          :disabled="isSending"
        ></textarea>

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

        <div class="chat-form__actions">
          <button class="chat-form__submit" type="submit" :disabled="isSending">
            {{ isSending ? '发送中…' : '发送' }}
          </button>
        </div>
      </form>

      <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
      <p v-else-if="isSending" class="feedback feedback--status">正在发送，请稍候…</p>

      <section v-if="responsePayload" class="response-panel">
        <h2>后端响应</h2>
        <pre>{{ formattedResponse }}</pre>
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
}

.response-panel pre {
  background: #0f172a;
  color: #f8fafc;
  padding: 1rem;
  border-radius: 12px;
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
