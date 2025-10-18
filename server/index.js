require('dotenv').config();

const express = require('express');
const multer = require('multer');
const morgan = require('morgan');

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const { generateImage } = require('./services/imageGeneration');
const { generateText } = require('./services/textGeneration');
const { searchNews } = require('./services/newsSearch');

const app = express();

app.use(morgan('combined'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldNameSize: 100,
    fieldSize: 64 * 1024, // 64KB per text field
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
  },
});

app.post('/api/message', upload.array('images', 5), async (req, res, next) => {
  try {
    if (!req.is('multipart/form-data')) {
      return res.status(400).json({ error: { message: 'Content-Type must be multipart/form-data.' } });
    }

    const body = req.body ?? {};
    const hasMessageField = Object.prototype.hasOwnProperty.call(body, 'message');
    const hasModeField = Object.prototype.hasOwnProperty.call(body, 'mode');

    if (!hasMessageField && !hasModeField) {
      return res
        .status(400)
        .json({ error: { message: 'invalid or unparsable multipart payload' } });
    }

    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const mode = typeof body?.mode === 'string' ? body.mode.trim() : 'text';
    const files = Array.isArray(req.files) ? req.files : [];

    if (!message && files.length === 0) {
      return res.status(400).json({ error: { message: 'Either message text or an image is required.' } });
    }

    if (mode === 'news') {
      try {
        const newsResponse = await searchNews({
          query: message,
          apiKey: NEWS_API_KEY,
          pageSize: 6,
        });

        return res.json(newsResponse);
      } catch (error) {
        const status = error.status || 502;
        return res.status(status).json({ error: { message: error.message } });
      }
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: { message: 'Server is missing OpenAI credentials.' } });
    }

    if (mode === 'image') {
      if (!message) {
        return res.status(400).json({ error: { message: 'Image generation requires a text prompt.' } });
      }

      const imageResponse = await generateImage({ prompt: message, size: '1024x1024' });
      return res.json(imageResponse);
    }

    const textResponse = await generateText({
      message,
      files,
      model: OPENAI_MODEL,
    });

    res.json(textResponse);
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    const payloadLimitCodes = new Set([
      'LIMIT_FIELD_VALUE',
      'LIMIT_FIELD_KEY',
      'LIMIT_FIELD_COUNT',
      'LIMIT_PART_COUNT',
    ]);

    if (payloadLimitCodes.has(err.code)) {
      return res.status(413).json({
        error: {
          message: 'Multipart payload exceeds allowed size limits.',
        },
      });
    }
  }

  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
