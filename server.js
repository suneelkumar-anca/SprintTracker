/**
 * Backend proxy for GitHub Copilot API
 * Forwards requests to api.githubcopilot.com server-side (avoids browser CORS restriction)
 * Runs alongside Vite dev server on port 3001
 */

import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import pino from 'pino';

const MODELS_API_URL = 'https://models.inference.ai.azure.com/chat/completions';
const ENV_PATH = new URL('.env', import.meta.url);

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  }
);

/** Parse .env on every call so token changes are picked up without restarting. */
function getEnvVar(key) {
  try {
    const env = readFileSync(ENV_PATH, 'utf8');
    for (const line of env.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      if (trimmed.slice(0, eq).trim() === key) return trimmed.slice(eq + 1).trim();
    }
  } catch { /* ignore */ }
  return process.env[key];
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased from 100kb default to handle comprehensive ticket data

/**
 * POST /api/retrospective
 * Proxies to api.githubcopilot.com — avoids browser CORS restriction
 * Body: { prompt }
 */
app.post('/api/retrospective', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    const token = getEnvVar('VITE_GITHUB_TOKEN');
    const model = getEnvVar('VITE_AI_MODEL') || 'gpt-4o';

    if (!token) {
      return res.status(503).json({ error: 'VITE_GITHUB_TOKEN not configured in .env' });
    }

    const response = await fetch(MODELS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Copilot API error');
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const usage = data.usage;
    const promptTokens = usage?.prompt_tokens ?? '?';
    const completionTokens = usage?.completion_tokens ?? '?';
    const totalTokens = usage?.total_tokens ?? '?';

    logger.info(
      { model, promptTokens, completionTokens, totalTokens },
      `Retrospective generated | ${totalTokens} tokens (${promptTokens} in / ${completionTokens} out)`
    );
    res.json({ retrospective: content });
  } catch (error) {
    logger.error(error, 'Retrospective generation failed');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (_req, res) => {
  const token = getEnvVar('VITE_GITHUB_TOKEN');
  res.json({ status: 'ok', token: token ? 'configured' : 'missing' });
});

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => {
  const token = getEnvVar('VITE_GITHUB_TOKEN');
  const model = getEnvVar('VITE_AI_MODEL') || 'gpt-4o';
  logger.info({ port: PORT, model, token: token ? 'configured' : 'MISSING' }, 'Proxy server started');
  logger.info(`Target: ${MODELS_API_URL}`);
  logger.info('Token reloads from .env on each request — no restart needed after changes');
});

process.on('SIGINT', () => process.exit(0));
