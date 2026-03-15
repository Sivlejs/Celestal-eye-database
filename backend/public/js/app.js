/* Dashboard — fetches live data from the Celestal Eye API */
(async function () {
  'use strict';

  // ── helpers ──────────────────────────────────────────────────────────────
  function fmt(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function fmtDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function badge(text) {
    return text ? `<span class="badge">${text}</span>` : '—';
  }

  function setBody(tableId, html) {
    document.querySelector(`#${tableId} tbody`).innerHTML = html;
  }

  function errRow(cols, msg) {
    return `<tr><td colspan="${cols}" class="error">⚠ ${msg}</td></tr>`;
  }

  async function apiFetch(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  // ── footer timestamp ─────────────────────────────────────────────────────
  document.getElementById('footer-time').textContent =
    new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  // ── Users ─────────────────────────────────────────────────────────────────
  async function loadUsers() {
    try {
      const users = await apiFetch('/api/users');
      document.getElementById('stat-users').textContent = users.length;

      if (!users.length) {
        setBody('users-table', '<tr><td colspan="4" class="loading">No users yet.</td></tr>');
        return;
      }

      setBody('users-table', users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${fmt(u.created_at)}</td>
        </tr>`).join(''));
    } catch (e) {
      document.getElementById('stat-users').textContent = '!';
      setBody('users-table', errRow(4, e.message));
    }
  }

  // ── Birth Charts ──────────────────────────────────────────────────────────
  async function loadCharts() {
    try {
      const charts = await apiFetch('/api/charts');
      document.getElementById('stat-charts').textContent = charts.length;

      if (!charts.length) {
        setBody('charts-table', '<tr><td colspan="7" class="loading">No charts yet.</td></tr>');
        return;
      }

      setBody('charts-table', charts.map(c => `
        <tr>
          <td>${c.id}</td>
          <td>${c.user_name}</td>
          <td>${fmt(c.birth_date)}</td>
          <td>${badge(c.sun_sign)}</td>
          <td>${badge(c.moon_sign)}</td>
          <td>${badge(c.rising_sign)}</td>
          <td>${c.birth_city || '—'}${c.birth_country ? ', ' + c.birth_country : ''}</td>
        </tr>`).join(''));
    } catch (e) {
      document.getElementById('stat-charts').textContent = '!';
      setBody('charts-table', errRow(7, e.message));
    }
  }

  // ── Celestial Events ──────────────────────────────────────────────────────
  async function loadEvents() {
    try {
      const events = await apiFetch('/api/events');
      document.getElementById('stat-events').textContent = events.length;

      if (!events.length) {
        setBody('events-table', '<tr><td colspan="6" class="loading">No events yet.</td></tr>');
        return;
      }

      setBody('events-table', events.map(e => `
        <tr>
          <td>${e.id}</td>
          <td>${e.event_name}</td>
          <td>${badge(e.event_type)}</td>
          <td>${e.celestial_body || '—'}</td>
          <td>${fmtDateTime(e.event_date)}</td>
          <td>${e.description || '—'}</td>
        </tr>`).join(''));
    } catch (e) {
      document.getElementById('stat-events').textContent = '!';
      setBody('events-table', errRow(6, e.message));
    }
  }

  // ── Load all in parallel ──────────────────────────────────────────────────
  await Promise.all([loadUsers(), loadCharts(), loadEvents()]);
})();
