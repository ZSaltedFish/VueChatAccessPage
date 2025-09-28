require('dotenv').config();

const express = require('express');
const multer = require('multer');
const morgan = require('morgan');

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const { generateImage } = require('./services/imageGeneration');
const { generateText } = require('./services/textGeneration');

const app = express();

app.use(morgan('combined'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
  },
});

app.post('/api/message', upload.array('images', 5), async (req, res, next) => {
  try {
    if (!req.is('multipart/form-data')) {
      return res.status(400).json({ error: { message: 'Content-Type must be multipart/form-data.' } });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: { message: 'Server is missing OpenAI credentials.' } });
    }

    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const mode = typeof req.body.mode === 'string' ? req.body.mode.trim() : 'text';
    const files = Array.isArray(req.files) ? req.files : [];

    if (!message && files.length === 0) {
      return res.status(400).json({ error: { message: 'Either message text or an image is required.' } });
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
