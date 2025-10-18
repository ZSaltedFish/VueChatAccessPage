const { URLSearchParams } = require('node:url');

const RAPID_API_ENDPOINT = 'https://real-time-news-data.p.rapidapi.com/search';

function normaliseArticle(article) {
  const title = article?.title?.trim() || article?.heading?.trim() || article?.name?.trim() || '未命名新闻';
  const description =
    article?.snippet?.trim() ||
    article?.summary?.trim() ||
    article?.description?.trim() ||
    '';
  const url = article?.url?.trim() || article?.link?.trim() || article?.article_url?.trim() || '';

  let source = '';
  if (typeof article?.source === 'string') {
    source = article.source.trim();
  } else if (article?.source?.title) {
    source = String(article.source.title).trim();
  } else if (article?.rights) {
    source = String(article.rights).trim();
  } else if (article?.author) {
    source = String(article.author).trim();
  }

  const publishedAt =
    article?.published_at ||
    article?.publishedAt ||
    article?.pubDate ||
    article?.date ||
    '';

  return { title, description, url, source, publishedAt };
}

async function searchNews({
  query,
  apiKey,
  apiHost,
  pageSize = 5,
  language = 'en',
  country = 'US',
  timePublished = 'anytime',
}) {
  if (!query || !query.trim()) {
    const error = new Error('新闻检索需要提供查询关键词。');
    error.status = 400;
    throw error;
  }

  if (!apiKey) {
    const error = new Error('服务器缺少 RapidAPI 访问密钥。');
    error.status = 500;
    throw error;
  }

  if (!apiHost) {
    const error = new Error('服务器缺少 RapidAPI Host 配置。');
    error.status = 500;
    throw error;
  }

  if (typeof fetch !== 'function') {
    const error = new Error('当前运行环境不支持 fetch API。');
    error.status = 500;
    throw error;
  }

  const params = new URLSearchParams({
    query,
    limit: String(pageSize),
  });

  if (language) {
    params.set('lang', language);
  }

  if (country) {
    params.set('country', country);
  }

  if (timePublished) {
    params.set('time_published', timePublished);
  }

  const requestUrl = `${RAPID_API_ENDPOINT}?${params.toString()}`;
  const response = await fetch(requestUrl, {
    headers: {
      Accept: 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost,
    },
  });

  if (!response.ok) {
    let errorMessage = `新闻服务请求失败：${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        errorMessage = `新闻服务请求失败：${payload.message}`;
      } else if (payload?.error) {
        const rapidError = typeof payload.error === 'string' ? payload.error : payload.error?.message;
        if (rapidError) {
          errorMessage = `新闻服务请求失败：${rapidError}`;
        }
      }
    } catch (parseError) {
      // ignore JSON parse error, retain status-based message
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const rawArticles = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.articles)
    ? payload.articles
    : [];
  const articles = rawArticles.map(normaliseArticle);
  const totalResults = Number.isInteger(payload?.total)
    ? payload.total
    : Number.isInteger(payload?.totalResults)
    ? payload.totalResults
    : Number.isInteger(payload?.meta?.found)
    ? payload.meta.found
    : articles.length;

  return {
    query,
    totalResults,
    articles,
    source: 'rapidapi.com',
  };
}

module.exports = {
  searchNews,
};
