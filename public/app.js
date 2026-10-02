const API_URL = '/api';
const userId = localStorage.getItem('userId') || `user_${Date.now()}`;
localStorage.setItem('userId', userId);

let currentTier = 'pro';
let sitesUsed = 0;
let sitesLimit = 3;
let currentLang = 'fr';
let selectedElement = null;

const I18N = {
  fr: {
    g: ['Bonjour', 'Bon après-midi', 'Bonsoir'],
    hi: (g) => `Je suis Be Code, ${g.toLowerCase()}`,
    ph: 'Bonjour Be Code.',
    il: 'idées de projet',
    ideas: ['Un site pour ma boutique', 'Mon portfolio', 'Le site de mon restaurant', 'Un blog personnel'],
    site: 'Voici ton site. Clique sur un élément pour le modifier en direct.',
    out: 'Tu as utilisé tes 3 sites gratuits. Tu peux encore poser des questions, faire des recherches ou du HTML simple.'
  },
  en: {
    g: ['Good morning', 'Good afternoon', 'Good evening'],
    hi: (g) => `I'm Be Code, ${g.toLowerCase()}`,
    ph: 'Hello Be Code.',
    il: 'project ideas',
    ideas: ['A site for my shop', 'My portfolio', 'My restaurant website', 'A personal blog'],
    site: 'Here is your site. Click an element to edit it live.',
    out: 'You have used your 3 free sites. You can still ask questions, run searches or write simple HTML.'
  }
};

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('on');
  setTimeout(() => toast.classList.remove('on'), 3200);
}

function setView(viewId) {
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('on'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('on');
}

function setAppPane(mode) {
  const app = document.getElementById('app');
  app.dataset.pane = mode;
}

function renderHello() {
  const t = I18N[currentLang];
  const hour = new Date().getHours();
  let greeting = t.g[0];
  if (hour >= 12 && hour < 18) greeting = t.g[1];
  if (hour >= 18) greeting = t.g[2];

  const hello = document.getElementById('hello');
  hello.textContent = t.hi(greeting);

  const idea = document.getElementById('idea');
  idea.textContent = t.ideas[0];

  const ideasLbl = document.getElementById('ideasLbl');
  ideasLbl.textContent = t.il;

  const dots = document.getElementById('dots');
  dots.innerHTML = '';
  t.ideas.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = idx === 0 ? 'on' : '';
    dot.addEventListener('click', () => {
      idea.textContent = t.ideas[idx];
      [...dots.children].forEach((b) => b.classList.remove('on'));
      dot.classList.add('on');
    });
    dots.appendChild(dot);
  });
}

async function loadUserState() {
  try {
    const res = await fetch(`${API_URL}/user/${userId}`);
    const data = await res.json();
    currentTier = data.tier || 'pro';
    sitesUsed = data.sitesUsed || 0;
    sitesLimit = data.sitesLimit || 3;
    updateLevelPill();
  } catch (error) {
    console.error('loadUserState error', error);
  }
}

function updateLevelPill() {
  const pill = document.getElementById('levelPill');
  const left = currentTier === 'flex' ? 'Beeflex' : currentTier === 'codex' ? 'Be Codex' : 'Be Pro';
  const remaining = Math.max(sitesLimit - sitesUsed, 0);
  pill.textContent = `${left} · ${remaining}`;
}

async function sendMessage() {
  const input = document.getElementById('inp');
  const text = input.value.trim();
  if (!text) return;

  appendMessage('user', text);
  input.value = '';

  const typing = document.createElement('div');
  typing.className = 'msg bot';
  typing.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
  document.getElementById('msgs').appendChild(typing);

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message: text, lang: currentLang })
    });
    const data = await res.json();
    typing.remove();

    if (data.message) {
      appendMessage('bot', data.message);
    }

    if (data.siteData) {
      renderSite(data.siteData);
    }

    if (data.userState) {
      currentTier = data.userState.tier || currentTier;
      sitesUsed = data.userState.sitesUsed || sitesUsed;
      sitesLimit = data.userState.sitesLimit || sitesLimit;
      updateLevelPill();
    }

    if (data.error === 'QUOTA_EXCEEDED' || data.requiresUpgrade) {
      showToast('Tu as atteint la limite de sites gratuits. Passe à Beeflex ou à un plan supérieur.');
      openUpgradeSheet();
    }
  } catch (error) {
    typing.remove();
    appendMessage('bot', 'Une erreur est survenue. Réessaie dans quelques secondes.');
    console.error(error);
  }
}

function appendMessage(role, text) {
  const msgs = document.getElementById('msgs');
  const wrapper = document.createElement('div');
  wrapper.className = `msg ${role}`;

  if (role === 'bot') {
    wrapper.innerHTML = `<div class="tag">Be Code</div><div class="t">${text.replace(/\n/g, '<br>')}</div>`;
  } else {
    wrapper.innerHTML = `<div class="t">${text}</div>`;
  }

  msgs.appendChild(wrapper);
  document.getElementById('scroll').scrollTop = document.getElementById('scroll').scrollHeight;
}

function renderSite(site) {
  const pane = document.getElementById('pane');
  const stage = document.getElementById('stage');

  const sections = Array.isArray(site.sections) ? site.sections : [];
  const nav = site.nav || 'Accueil · Services · Contact';

  stage.innerHTML = `
    <div class="site">
      <nav>
        <strong>${site.brand || 'Mon site'}</strong>
        <span>${nav}</span>
      </nav>
      <section>
        <h1 data-e="hero_title">${site.hero_title || 'Titre'}</h1>
        <p data-e="hero_desc">${site.hero_desc || 'Description'}</p>
        <a href="#" class="cta">${site.cta || 'Découvrir'}</a>
      </section>

      <div class="cols">
        ${sections.map((item, index) => `
          <div data-e="section-${index}" class="feature-card">
            <strong>${item.title || 'Section'}</strong>
            <p>${item.content || 'Contenu'}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('app').classList.add('split');
  setAppPane('preview');

  document.querySelectorAll('[data-e]').forEach((node) => {
    node.addEventListener('click', () => {
      selectedElement = node;
      document.querySelectorAll('[data-e]').forEach((el) => el.classList.remove('sel'));
      node.classList.add('sel');
      activateEditor(node);
    });
  });
}

function activateEditor(node) {
  const editor = document.getElementById('editor');
  const textInput = document.getElementById('edText');
  editor.classList.add('on');
  editor.classList.remove('limited', 'mid');

  if (currentTier === 'pro') editor.classList.add('limited');
  if (currentTier === 'codex') editor.classList.add('mid');

  textInput.value = node.textContent.trim();

  textInput.oninput = () => {
    if (currentTier === 'pro' && selectedElement) {
      selectedElement.textContent = textInput.value;
      return;
    }
    if (selectedElement) selectedElement.textContent = textInput.value;
  };
}

function openUpgradeSheet() {
  document.getElementById('sheet').classList.add('on');
}

function closeUpgradeSheet() {
  document.getElementById('sheet').classList.remove('on');
}

async function upgradePlan(tier) {
  try {
    const res = await fetch(`${API_URL}/upgrade-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newTier: tier })
    });
    const data = await res.json();
    if (data.success) {
      currentTier = tier;
      if (tier === 'pro') sitesLimit = 3;
      if (tier === 'codex') sitesLimit = 10;
      if (tier === 'flex') sitesLimit = 9999;
      updateLevelPill();
      closeUpgradeSheet();
      showToast(`Bienvenue sur ${tier === 'flex' ? 'Beeflex' : tier === 'codex' ? 'Be Codex' : 'Be Pro'} !`);
    }
  } catch (error) {
    console.error('upgradePlan error', error);
  }
}

function bindNavigation() {
  document.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.go;
      if (target === 'home') setView('v-home');
      if (target === 'signup') setView('v-signup');
      if (target === 'app') setView('v-app');
      if (target === 'beeflex') {
        setView('v-home');
        openUpgradeSheet();
      }
    });
  });

  document.getElementById('signBtn').addEventListener('click', () => {
    setView('v-app');
    renderHello();
    loadUserState();
  });

  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('inp').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendMessage();
  });

  document.querySelectorAll('.opt').forEach((btn) => {
    btn.addEventListener('click', () => upgradePlan(btn.dataset.lv));
  });

  document.getElementById('flexChip').addEventListener('click', () => openUpgradeSheet());
}

renderHello();
bindNavigation();
loadUserState();
