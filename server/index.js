require('dotenv').config();

const express = require('express');
const multer = require('multer');
const morgan = require('morgan');

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

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

      const imageBody = {
        model: 'gpt-image-1',
        prompt: message,
        size: '1024x1024',
        response_format: 'b64_json',
      };

      const response = await fetch('https://api.openai.com/v1/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(imageBody),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('OpenAI API error:', data);
        return res.status(response.status).json({
          error: {
            message: data.error?.message || 'Failed to process request.',
          },
        });
      }

      const imageResult = Array.isArray(data.data) ? data.data[0] : null;

      return res.json({
        result: data,
        image: imageResult
          ? {
              b64_json: imageResult.b64_json,
              mime_type: imageResult.mime_type || 'image/png',
            }
          : null,
      });
    }

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

    const body = {
      model: OPENAI_MODEL,
      input: [
        {
          role: 'user',
          content,
        },
      ],
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return res.status(response.status).json({
        error: {
          message: data.error?.message || 'Failed to process request.',
        },
      });
    }

    res.json({
      result: data,
    });
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
