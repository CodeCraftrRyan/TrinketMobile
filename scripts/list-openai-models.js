#!/usr/bin/env node
// scripts/list-openai-models.js
// Usage: OPENAI_API_KEY="sk-..." node scripts/list-openai-models.js
// This prints model ids accessible to your key and filters likely image/embedding candidates.

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error('Error: set OPENAI_API_KEY in env and re-run.');
  process.exit(1);
}

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

(async () => {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const data = await res.json();

    if (!data) {
      console.error('No response from OpenAI API');
      process.exit(1);
    }

    if (!Array.isArray(data.data)) {
      console.log(JSON.stringify(data, null, 2));
      process.exit(0);
    }

    console.log('\n=== Models accessible to your key ===\n');
    data.data.forEach((m) => console.log(m.id));

    console.log('\n=== Filtered candidates (image/vision/clip/embed/embedding/img) ===\n');
    const candidates = data.data.filter((m) => {
      const id = (m.id || '').toString();
      const combined = id + ' ' + JSON.stringify(m || {});
      return /image|vision|clip|embed|embedding|img/i.test(combined);
    });
    if (candidates.length === 0) {
      console.log('(no obvious candidates found)');
    } else {
      candidates.forEach((m) => console.log(m.id));
    }

    console.log('\nTo inspect a model in detail, run:');
    console.log('curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models/<MODEL_ID>');
    console.log('');
  } catch (err) {
    console.error('Error calling OpenAI API:', err);
    process.exit(1);
  }
})();
