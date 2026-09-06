'use strict';

import { h } from '../utils/escape.js';
import { state as userState } from '../store/user.js';
import { toast } from '../components/toast.js';
import { readStorage, writeStorage, SK } from '../utils/storage.js';
import { log } from '../firebase/config.js';

// Target email address safely encapsulated in application logic, not exposed in static DOM
const FEEDBACK_EMAIL = 'contact.manoj.official@gmail.com';

export function renderFeedback() {
  const el = document.getElementById('feedbackContent');
  if (!el) return;

  const user = userState.currentUser;
  
  el.innerHTML = `
    <div class="feedback-hero">
      <h3>💬 Share Your Feedback</h3>
      <p>Have an idea, bug report, or feature request? Let us know!</p>
    </div>
    <div class="fb-field">
      <label for="fbName">Your Name</label>
      <input type="text" id="fbName" placeholder="Enter your name" autocomplete="name" value="${user ? h(user.name || user.username || '') : ''}">
    </div>
    <div class="fb-field">
      <label for="fbCategory">Category</label>
      <select id="fbCategory" class="fb-select">
        <option value="💡 Feature Request">💡 Feature Request</option>
        <option value="🐞 Bug Report">🐞 Bug Report</option>
        <option value="🎬 Content Suggestion">🎬 Content Suggestion</option>
        <option value="💬 General Feedback">💬 General Feedback</option>
      </select>
    </div>
    <div class="fb-field">
      <label for="fbMsg">Message / Suggestion</label>
      <textarea id="fbMsg" placeholder="Describe your feedback or suggestions in detail…" rows="5"></textarea>
      <span class="fb-hint">💡 Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to send directly</span>
    </div>
    <div class="fb-actions">
      <button class="btn-submit" id="fbSubmit" type="button">✉️ Send Feedback via Email</button>
      <button class="btn-ghost btn-gmail" id="fbGmail" type="button">🌐 Open in Gmail Web</button>
    </div>`;

  function sendFeedback(target = 'mailto') {
    const nameInput = document.getElementById('fbName');
    const msgInput = document.getElementById('fbMsg');
    const catInput = document.getElementById('fbCategory');

    const name = nameInput ? nameInput.value.trim() : '';
    const msg = msgInput ? msgInput.value.trim() : '';
    const category = catInput ? catInput.value : '💬 General Feedback';

    if (!name) {
      toast('Please enter your name', 'err');
      nameInput?.focus();
      return;
    }
    if (!msg) {
      toast('Please enter your feedback message', 'err');
      msgInput?.focus();
      return;
    }

    const timestamp = new Date().toLocaleString();
    const subject = `[MovieUltra Feedback] ${category} from ${name}`;
    const bodyText = 
`Hi MovieUltra Team,

${category}
From: ${name} (User: ${user?.username || 'Guest'})
Date: ${timestamp}
Platform: MovieUltra Web (v2.1.0)

--------------------------------------------------
MESSAGE:
${msg}
--------------------------------------------------
`;

    // Persist locally in user feedback store
    const fbRecord = {
      name,
      category,
      message: msg,
      timestamp: new Date().toISOString(),
      user: user?.username || 'guest'
    };
    try {
      const prev = readStorage(SK.feedback, []);
      prev.push(fbRecord);
      writeStorage(SK.feedback, prev);
    } catch { /* ignore storage error */ }

    log('[MovieUltra] Feedback submitted:', fbRecord);

    if (target === 'gmail') {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(FEEDBACK_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      toast('📬 Opening in Gmail Web...', 'ok');
    } else {
      const mailtoUrl = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      const a = document.createElement('a');
      a.href = mailtoUrl;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
      toast('📬 Opening your email client...', 'ok');
    }

    if (msgInput) msgInput.value = '';
  }

  // Click listeners
  document.getElementById('fbSubmit')?.addEventListener('click', () => sendFeedback('mailto'));
  document.getElementById('fbGmail')?.addEventListener('click', () => sendFeedback('gmail'));

  // Keyboard workflow: Enter on name field focuses message textarea
  document.getElementById('fbName')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('fbMsg')?.focus();
    }
  });

  // Keyboard workflow: Ctrl+Enter or Cmd+Enter on message triggers immediate send
  document.getElementById('fbMsg')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendFeedback('mailto');
    }
  });
}
