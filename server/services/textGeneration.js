const client = require('../openaiClient');
const { normaliseOpenAIError, readResponseBody } = require('../utils/openaiHelpers');

function buildContent(message, files) {
  const content = [];

  if (message) {
    content.push({ type: 'input_text', text: message });
  }

  files.forEach((file) => {
    if (!file.mimetype.startsWith('image/')) {
      throw Object.assign(new Error('Only image uploads are supported.'), { status: 400 });
    }

    const base64 = file.buffer.toString('base64');
    content.push({
      type: 'input_image',
      image_url: `data:${file.mimetype};base64,${base64}`,
    });
  });

  return content;
}

async function generateText({ message, files = [], model }) {
  const content = buildContent(message, files);

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: 'user',
          content,
        },
      ],
      extra_headers: {
        'OpenAI-Beta': 'assistants=v1',
      },
    });

    return { result: response };
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

    const messageText = normaliseOpenAIError(
      parsed,
      raw,
      'OpenAI API returned an unreadable response while processing the request. Please try again later.'
    );

    const normalisedError = new Error(messageText);
    normalisedError.status = error.status || error.response?.status || 502;
    throw normalisedError;
  }
}

module.exports = {
  generateText,
};
