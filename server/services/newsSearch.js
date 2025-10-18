const { URLSearchParams } = require('node:url');

const NEWS_API_ENDPOINT = 'https://newsapi.org/v2/everything';

function normaliseArticle(article) {
  const title = article?.title?.trim() || '未命名新闻';
  const description = article?.description?.trim() || '';
  const url = article?.url?.trim() || '';
  const source = article?.source?.name?.trim() || '';
  const publishedAt = article?.publishedAt || '';

  return { title, description, url, source, publishedAt };
}

async function searchNews({ query, apiKey, pageSize = 5, language = 'zh', sortBy = 'publishedAt' }) {
  if (!query || !query.trim()) {
    const error = new Error('新闻检索需要提供查询关键词。');
    error.status = 400;
    throw error;
  }

  if (!apiKey) {
    const error = new Error('服务器缺少新闻数据源的访问密钥。');
    error.status = 500;
    throw error;
  }

  if (typeof fetch !== 'function') {
    const error = new Error('当前运行环境不支持 fetch API。');
    error.status = 500;
    throw error;
  }

  const params = new URLSearchParams({
    q: query,
    apiKey,
    language,
    sortBy,
    pageSize: String(pageSize),
  });

  const requestUrl = `${NEWS_API_ENDPOINT}?${params.toString()}`;
  const response = await fetch(requestUrl, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    let errorMessage = `新闻服务请求失败：${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        errorMessage = `新闻服务请求失败：${payload.message}`;
      }
    } catch (parseError) {
      // ignore JSON parse error, retain status-based message
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const articles = Array.isArray(payload?.articles) ? payload.articles.map(normaliseArticle) : [];
  const totalResults = Number.isInteger(payload?.totalResults) ? payload.totalResults : articles.length;

  return {
    query,
    totalResults,
    articles,
    source: 'newsapi.org',
  };
}

module.exports = {
  searchNews,
};
