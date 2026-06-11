'use strict';

import { h } from '../utils/escape.js';
import { state as userState } from '../store/user.js';
import { toast } from '../components/toast.js';
import { readStorage, writeStorage, SK } from '../utils/storage.js';
import { log } from '../firebase/config.js';

export function renderFeedback() {
  const el = document.getElementById('feedbackContent');
  if (!el) return;

  const user = userState.currentUser;
  
  el.innerHTML = `
    <div class="feedback-hero">
      <h3>💬 Share Your Feedback</h3>
      <p>Found a bug? Feature request? We'd love to hear from you!</p>
    </div>
    <div class="fb-field">
      <label for="fbName">Your Name</label>
      <input type="text" id="fbName" placeholder="Enter your name" autocomplete="name" value="${user ? h(user.name) : ''}">
    </div>
    <div class="fb-field">
      <label for="fbMsg">Message / Suggestion</label>
      <textarea id="fbMsg" placeholder="Describe your feedback…" rows="5"></textarea>
    </div>
    <button class="btn-submit" id="fbSubmit">📤 Send Feedback</button>
    <div class="feedback-contact">
      <h4>📬 Reach Out Directly</h4>
      <div class="contact-row">
        <div class="contact-icon">✈️</div>
        <div>
          <div class="contact-lbl">TELEGRAM</div>
          <div class="contact-val"><a href="https://t.me/Kakashi_arrine" target="_blank" rel="noopener">@Kakashi_arrine</a></div>
        </div>
      </div>
      <div class="contact-row">
        <div class="contact-icon">📧</div>
        <div>
          <div class="contact-lbl">EMAIL</div>
          <div class="contact-val"><a href="mailto:contact.manoj.official@gmail.com">contact.manoj.official@gmail.com</a></div>
        </div>
      </div>
    </div>`;

  document.getElementById('fbSubmit')?.addEventListener('click', () => {
    const nameInput = document.getElementById('fbName');
    const msgInput = document.getElementById('fbMsg');
    
    const name = nameInput ? nameInput.value.trim() : '';
    const msg = msgInput ? msgInput.value.trim() : '';

    if (!name) {
      toast('Please enter your name', 'err');
      return;
    }
    if (!msg) {
      toast('Please enter a message', 'err');
      return;
    }

    const fb = {
      name,
      message: msg,
      timestamp: new Date().toISOString(),
      user: user?.username || 'guest'
    };

    const prev = readStorage(SK.feedback, []);
    prev.push(fb);
    writeStorage(SK.feedback, prev);

    log('[MovieUltra] Feedback submitted:', fb);
    toast('✅ Feedback sent! Thank you!');
    
    if (msgInput) msgInput.value = '';
  });
}
