import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

const SYSTEM_PROMPT = {
  fr: `Tu es Be Code, une IA créative spécialisée dans la création de sites web.

Tu aides l'utilisateur à imaginer, structurer, analyser et améliorer un concept numérique.

Règles :
- Sois utile, clair, créatif, concret.
- Propose des idées adaptées à la demande.
- Si l'utilisateur veut un site, réponds avec un objet JSON dans une balise <site-generated> ... </site-generated>.
- Reste sérieux, enthousiaste et orienté solution.
- Les plans: Be Pro = 3 sites gratuits + texte seulement, Beeflex = contrôle complet.

Format de réponse si un site est généré :
<site-generated>
{
  "brand": "Nom du site",
  "nav": "Accueil · Services · Contact",
  "hero_title": "Titre principal",
  "hero_desc": "Description",
  "cta": "Découvrir",
  "sections": [
    { "title": "Section 1", "content": "Contenu" },
    { "title": "Section 2", "content": "Contenu" }
  ],
  "features": ["Rapide", "Mobile", "Éditable"]
}
</site-generated>
`,
  en: `You are Be Code, a creative AI specialized in web creation.

You help users imagine, structure, analyze and improve digital concepts.

Rules:
- Be helpful, clear, creative, practical.
- Propose ideas that fit the request.
- If the user wants a site, respond with a JSON object wrapped in <site-generated> ... </site-generated>.
- Stay positive and solution-oriented.
- Plans: Be Pro = 3 free sites + text editing only. Beeflex = full control.

If a site is generated, use this format:
<site-generated>
{
  "brand": "Site Name",
  "nav": "Home · Services · Contact",
  "hero_title": "Main title",
  "hero_desc": "Short description",
  "cta": "Discover",
  "sections": [
    { "title": "Section 1", "content": "Content" },
    { "title": "Section 2", "content": "Content" }
  ],
  "features": ["Fast", "Mobile", "Editable"]
}
</site-generated>
`
};

async function ensureStore() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(STORE_PATH);
  } catch {
    const defaultStore = { users: {} };
    await fs.writeFile(STORE_PATH, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return { users: {} };
  }
}

async function writeStore(store) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function buildUserDefaults() {
  return {
    tier: 'pro',
    sitesUsed: 0,
    sitesLimit: 3,
    messages: [],
    currentSite: null,
    editHistory: []
  };
}

async function getUser(userId) {
  const store = await readStore();
  if (!store.users[userId]) {
    store.users[userId] = buildUserDefaults();
    await writeStore(store);
  }
  return store;
}

async function persistUser(userId, userData) {
  const store = await readStore();
  store.users[userId] = userData;
  await writeStore(store);
  return store.users[userId];
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'be-code-api' });
});

app.get('/api/user/:userId', async (req, res) => {
  try {
    const store = await readStore();
    const user = store.users[req.params.userId] || buildUserDefaults();
    res.json({
      tier: user.tier,
      sitesUsed: user.sitesUsed,
      sitesLimit: user.sitesLimit,
      currentSite: user.currentSite,
      messageCount: user.messages?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message, lang = 'fr' } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing userId or message' });
    }

    const store = await readStore();
    const user = store.users[userId] || buildUserDefaults();
    user.messages = user.messages || [];
    user.messages.push({ role: 'user', content: String(message) });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 1600,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT[lang] || SYSTEM_PROMPT.fr },
        ...user.messages
      ]
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'Je peux t’aider.';
    user.messages.push({ role: 'assistant', content: assistantMessage });

    let siteData = null;
    const siteMatch = assistantMessage.match(/<site-generated>([\s\S]*?)<\/site-generated>/i);
    if (siteMatch) {
      try {
        siteData = JSON.parse(siteMatch[1]);
      } catch (error) {
        console.error('Failed to parse generated site JSON:', error.message);
      }
    }

    if (siteData && user.tier === 'pro' && user.sitesUsed >= user.sitesLimit) {
      store.users[userId] = user;
      await writeStore(store);
      return res.json({
        message: assistantMessage,
        siteData,
        error: 'QUOTA_EXCEEDED',
        requiresUpgrade: true,
        userState: {
          tier: user.tier,
          sitesUsed: user.sitesUsed,
          sitesLimit: user.sitesLimit
        }
      });
    }

    if (siteData) {
      user.currentSite = {
        id: `site_${Date.now()}`,
        ...siteData,
        createdAt: new Date().toISOString()
      };
      user.sitesUsed += 1;
    }

    store.users[userId] = user;
    await writeStore(store);

    res.json({
      message: assistantMessage,
      siteData,
      userState: {
        tier: user.tier,
        sitesUsed: user.sitesUsed,
        sitesLimit: user.sitesLimit
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'API error' });
  }
});

app.post('/api/upgrade-plan', async (req, res) => {
  try {
    const { userId, newTier } = req.body;
    if (!userId || !newTier) {
      return res.status(400).json({ error: 'Missing userId or newTier' });
    }

    const store = await readStore();
    const user = store.users[userId] || buildUserDefaults();
    const validTiers = ['pro', 'codex', 'flex'];
    if (!validTiers.includes(newTier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    user.tier = newTier;
    if (newTier === 'pro') user.sitesLimit = 3;
    else if (newTier === 'codex') user.sitesLimit = 10;
    else if (newTier === 'flex') user.sitesLimit = 9999;

    store.users[userId] = user;
    await writeStore(store);

    res.json({
      success: true,
      tier: user.tier,
      sitesLimit: user.sitesLimit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/:userId/reset', async (req, res) => {
  try {
    const store = await readStore();
    const user = store.users[req.params.userId] || buildUserDefaults();
    user.messages = [];
    user.currentSite = null;
    user.editHistory = [];
    store.users[req.params.userId] = user;
    await writeStore(store);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/edit-element', async (req, res) => {
  try {
    const { userId, elementId, edits, field } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const store = await readStore();
    const user = store.users[userId] || buildUserDefaults();

    if (user.tier === 'pro' && !['text', 'content'].includes(field)) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Be Pro permet seulement l’édition de texte. Passe à Beeflex pour contrôler les couleurs, tailles et mise en page.'
      });
    }

    if (user.currentSite) {
      user.editHistory = user.editHistory || [];
      user.editHistory.push({
        timestamp: new Date().toISOString(),
        elementId,
        field,
        edits
      });

      if (user.currentSite.sections) {
        const target = user.currentSite.sections.find((section) => section.id === elementId || section.title === elementId);
        if (target) Object.assign(target, edits);
      }

      if (user.currentSite.hero_title && elementId === 'hero_title') {
        user.currentSite.hero_title = edits.text || user.currentSite.hero_title;
      }

      if (user.currentSite.hero_desc && elementId === 'hero_desc') {
        user.currentSite.hero_desc = edits.text || user.currentSite.hero_desc;
      }
    }

    store.users[userId] = user;
    await writeStore(store);

    res.json({ success: true, site: user.currentSite });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

async function main() {
  await ensureStore();
  app.listen(PORT, () => {
    console.log(`Be Code API running on http://localhost:${PORT}`);
  });
}

main();
