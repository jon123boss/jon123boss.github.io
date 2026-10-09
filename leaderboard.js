import { escapeHTML as escape } from './site-utils.js';

export function setupLeaderboard(host) {
  const events = new AbortController();
  async function load() {
    try {
      const response = await fetch('./blog/purrence/leaderboard.json?v=attention-compute-20261005', { signal: events.signal });
      if (!response.ok) throw new Error('Leaderboard comparison unavailable');
      const data = await response.json();
      if (events.signal.aborted || !host.isConnected) return;
      host.className = 'research-diagram leaderboard-diagram';
      host.innerHTML = `<header class="leader-header"><h3>${escape(data.title)}</h3></header>
        <ol class="leader-rows" aria-label="Comparison ordered by score" style="--leader-count:${data.rows.length}">${data.rows.map((row, index) => `<li class="leader-row${row.local ? ' leader-local' : ''}" style="--leader-slot:${index};--leader-score:${row.score / 10 * 100}%">
          <span class="leader-rank" aria-hidden="true">${index + 1}</span>
          <div class="leader-name">${row.url ? `<a href="${escape(row.url)}" target="_blank" rel="noopener noreferrer">${escape(row.name.replaceAll('-', ' '))}</a>` : `<strong>${escape(row.name)}</strong>`}<small>${(row.parameters / 1e6).toFixed(2)}M parameters</small></div>
          <span class="leader-score" title="${row.score.toFixed(6)}">${row.score.toFixed(2)}</span>
          <div class="leader-track" aria-hidden="true"><span></span></div>
        </li>`).join('')}</ol><p class="plot-meta">Intelligence index · models under 3M parameters</p>
        <div class="leader-footer"><a href="${escape(data.source)}" target="_blank" rel="noopener noreferrer">Open SLM Leaderboard · ${escape(data.snapshot)} ↗</a></div>`;
    } catch (error) {
      if (events.signal.aborted) return;
      host.innerHTML = '<p class="plot-load-error">The leaderboard comparison could not load. <button type="button">Try again</button></p>';
      host.querySelector('button').addEventListener('click', load, { once: true, signal: events.signal });
    }
  }
  load();
  return () => events.abort();
}
