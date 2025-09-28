function normaliseOpenAIError(parsedBody, rawBody, fallbackMessage = 'Failed to process request.') {
  if (parsedBody?.error?.message) {
    return parsedBody.error.message;
  }

  if (typeof rawBody === 'string' && rawBody.trim()) {
    const trimmed = rawBody.trim();

    if (trimmed.startsWith('<')) {
      return 'OpenAI API returned an unexpected HTML response. Please try again later.';
    }

    return trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed;
  }

  return fallbackMessage;
}

async function readResponseBody(response) {
  if (!response || typeof response.text !== 'function') {
    return { parsed: null, raw: '' };
  }

  let rawBody = '';

  try {
    rawBody = await response.text();
  } catch (error) {
    console.error('Failed to read OpenAI error response body:', error);
    return { parsed: null, raw: '' };
  }

  if (!rawBody) {
    return { parsed: null, raw: '' };
  }

  try {
    return { parsed: JSON.parse(rawBody), raw: rawBody };
  } catch (error) {
    return { parsed: null, raw: rawBody };
  }
}

module.exports = {
  normaliseOpenAIError,
  readResponseBody,
};
