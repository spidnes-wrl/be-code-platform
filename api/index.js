import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const SYSTEM_PROMPT = {
  fr: `Tu es Be Code, une IA créative spécialisée dans la création de sites web. Créé par Monestime Arvens Warley - NATE Technology.

Tu aides l'utilisateur à imaginer, structurer, analyser et améliorer un concept numérique.

Règles :
- Sois utile, clair, créatif, concret.
- Propose des idées adaptées à la demande.
- Si l'utilisateur veut un site, réponds avec un objet JSON dans une balise <site-generated> ... </site-generated>.
- Reste sérieux, enthousiaste et orienté solution.
- Les plans: Be Pro = 3 sites gratuits + texte seulement, Beeflex = contrôle complet.
- Limite des sites jusqu'au 2 décembre 2026, puis tarification appliquée.

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
  en: `You are Be Code, a creative AI specialized in web creation. Created by Monestime Arvens Warley - NATE Technology.

You help users imagine, structure, analyze and improve digital concepts.

Rules:
- Be helpful, clear, creative, practical.
- Propose ideas that fit the request.
- If the user wants a site, respond with a JSON object wrapped in <site-generated> ... </site-generated>.
- Stay positive and solution-oriented.
- Plans: Be Pro = 3 free sites + text editing only. Beeflex = full control.
- Free sites limited until December 2, 2026, then pricing applied.

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

const db = new Map();

function buildUserDefaults() {
  return {
    tier: 'pro',
    sitesUsed: 0,
    sitesLimit: 3,
    messages: [],
    currentSite: null,
    editHistory: [],
    createdAt: new Date().toISOString()
  };
}

function getUser(userId) {
  if (!db.has(userId)) {
    db.set(userId, buildUserDefaults());
  }
  return db.get(userId);
}

app.get('/api/health', (_req, res) => {
  res.json({ 
    ok: true, 
    service: 'be-code-api',
    status: 'live',
    version: '1.0.0',
    creator: 'Monestime Arvens Warley'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message, lang = 'fr' } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing userId or message' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const user = getUser(userId);
    user.messages = user.messages || [];
    user.messages.push({ role: 'user', content: String(message) });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 1600,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT[lang] || SYSTEM_PROMPT.fr },
        ...user.messages.slice(-10) // Keep last 10 messages for context
      ]
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'Je peux t\'aider.';
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

app.get('/api/user/:userId', (req, res) => {
  try {
    const user = getUser(req.params.userId);
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

app.post('/api/upgrade-plan', (req, res) => {
  try {
    const { userId, newTier } = req.body;
    if (!userId || !newTier) {
      return res.status(400).json({ error: 'Missing userId or newTier' });
    }

    const user = getUser(userId);
    const validTiers = ['pro', 'codex', 'flex'];
    if (!validTiers.includes(newTier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    user.tier = newTier;
    if (newTier === 'pro') user.sitesLimit = 3;
    else if (newTier === 'codex') user.sitesLimit = 10;
    else if (newTier === 'flex') user.sitesLimit = 9999;

    res.json({
      success: true,
      tier: user.tier,
      sitesLimit: user.sitesLimit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/edit-element', (req, res) => {
  try {
    const { userId, elementId, edits, field } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const user = getUser(userId);

    if (user.tier === 'pro' && !['text', 'content'].includes(field)) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Be Pro permet seulement l\'édition de texte. Passe à Beeflex pour contrôler les couleurs, tailles et mise en page.'
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
    }

    res.json({ success: true, site: user.currentSite });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/:userId/reset', (req, res) => {
  try {
    const user = getUser(req.params.userId);
    user.messages = [];
    user.currentSite = null;
    user.editHistory = [];
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;

export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🐝 Be Code API running on http://localhost:${PORT}`);
  });
}
