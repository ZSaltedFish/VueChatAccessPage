const client = require('../openaiClient');
const { normaliseOpenAIError, readResponseBody } = require('../utils/openaiHelpers');

async function generateImage({ prompt, size = '1024x1024' }) {
  try {
    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      size,
      n: 1,
    });

    const imageResult = Array.isArray(response.data) ? response.data[0] : null;

    return {
      result: response,
      image: imageResult
        ? {
            b64_json: imageResult.b64_json,
            mime_type: imageResult.mime_type || 'image/png',
          }
        : null,
    };
  } catch (error) {
    let parsed = null;
    let raw = '';

    if (error.response) {
      const body = await readResponseBody(error.response);
      parsed = body.parsed;
      raw = body.raw;
      console.error('OpenAI API error:', parsed ?? raw);
    } else {
      raw = error?.message || '';
      console.error('OpenAI API error:', error);
    }

    const message = normaliseOpenAIError(
      parsed,
      raw,
      'OpenAI API returned an unreadable response while generating the image. Please try again later.'
    );

    const normalisedError = new Error(message);
    normalisedError.status = error.status || error.response?.status || 502;
    throw normalisedError;
  }
}

module.exports = {
  generateImage,
};
