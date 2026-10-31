const API_BASE = '/api';

class App {
  constructor() {
    this.token = localStorage.getItem('token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    this.events = [];
    this.searchTimer = null;
    this.init();
  }


  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  init() {
    this.updateAuthUI();
    this.verifySession();
    this.fetchEvents();
  }

  async verifySession() {
    if (!this.token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.status === 401) {
        // Token has expired or been revoked; silently reset stale session
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.updateAuthUI();
        this.toast('Session expired or invalidated. Please sign in again.', 'info');
      }
    } catch (err) {
      // Network failure, skip
    }
  }

  // --- Auth & State ---
  updateAuthUI() {
    const authControls = document.getElementById('auth-controls');
    const userControls = document.getElementById('user-profile-controls');
    const myEventsBtn = document.getElementById('nav-my-events-btn');
    const organizerBtn = document.getElementById('nav-organizer-btn');
    const adminBtn = document.getElementById('nav-admin-btn');

    if (this.currentUser && this.token) {
      authControls.style.display = 'none';
      userControls.style.display = 'flex';
      document.getElementById('user-display-name').innerText = this.currentUser.name;
      document.getElementById('user-role-badge').innerText = this.currentUser.role.toUpperCase();

      myEventsBtn.style.display = 'inline-flex';
      organizerBtn.style.display = (this.currentUser.role === 'organizer' || this.currentUser.role === 'admin') ? 'inline-flex' : 'none';
      adminBtn.style.display = (this.currentUser.role === 'admin') ? 'inline-flex' : 'none';
    } else {
      authControls.style.display = 'flex';
      userControls.style.display = 'none';
      myEventsBtn.style.display = 'none';
      organizerBtn.style.display = 'none';
      adminBtn.style.display = 'none';
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.currentUser));

      this.hideModal('login-modal');
      this.updateAuthUI();
      this.toast(`Welcome back, ${data.user.name}!`, 'success');
      this.fetchEvents();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.currentUser));

      this.hideModal('register-modal');
      this.updateAuthUI();
      this.toast('Account registered successfully!', 'success');
      this.fetchEvents();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  async logout() {
    if (this.token) {
      try {
        const res = await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.warn('Backend logout response not OK:', data.error);
        }
      } catch (err) {
        console.error('Network error during backend logout:', err);
      }
    }

    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.updateAuthUI();
    this.navigate('home');
    this.toast('Signed out successfully.', 'info');
    this.fetchEvents();
  }

  // --- Views & Routing ---
  navigate(viewName) {
    ['home', 'my-events', 'organizer', 'admin'].forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = (v === viewName) ? 'block' : 'none';
    });

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (viewName === 'home') document.getElementById('nav-events-btn').classList.add('active');
    if (viewName === 'my-events') {
      document.getElementById('nav-my-events-btn').classList.add('active');
      this.fetchMyEvents();
    }
    if (viewName === 'organizer') {
      document.getElementById('nav-organizer-btn').classList.add('active');
      this.fetchOrganizerEvents();
    }
    if (viewName === 'admin') {
      document.getElementById('nav-admin-btn').classList.add('active');
      this.fetchAdminData();
    }
  }

  // --- Explore Events ---
  async fetchEvents() {
    const search = document.getElementById('search-input')?.value || '';
    const category = document.getElementById('category-filter')?.value || 'All';

    let url = `${API_BASE}/events?`;
    if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;
    if (category && category !== 'All') url += `category=${encodeURIComponent(category)}&`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      this.events = data.events || [];
      this.renderEvents(this.events, 'events-list');
    } catch (err) {
      this.toast('Failed to load events.', 'error');
    }
  }

  debouncedSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.fetchEvents(), 300);
  }

  filterEvents() {
    this.fetchEvents();
  }

  renderEvents(events, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    if (events.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius); border: 1px dashed var(--border);">
          <i class="fa-regular fa-calendar-xmark" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h3>No events found</h3>
          <p style="color: var(--text-muted);">Try adjusting your search filters or check back later.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = events.map(evt => {
      const pct = Math.min(100, Math.round((evt.registered_count / evt.capacity) * 100));
      const isFull = evt.registered_count >= evt.capacity;
      const isCancelled = evt.status === 'cancelled';

      return `
        <div class="event-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="event-badge">${evt.category}</span>
            ${isCancelled ? '<span style="color: var(--danger); font-size: 0.8rem; font-weight: 700;">CANCELLED</span>' : ''}
          </div>
          <h3>${evt.title}</h3>
          <p class="description">${evt.description || 'No description provided.'}</p>
          
          <div class="event-meta">
            <span><i class="fa-regular fa-calendar" style="color: var(--secondary);"></i> ${evt.date} at ${evt.time}</span>
            <span><i class="fa-solid fa-location-dot" style="color: #ec4899;"></i> ${evt.location}</span>
            <span><i class="fa-solid fa-user-tie" style="color: #a78bfa;"></i> Hosted by ${evt.organizer_name}</span>
          </div>

          <div class="capacity-bar-container">
            <div class="capacity-info">
              <span>Capacity (${evt.registered_count} / ${evt.capacity})</span>
              <span>${isFull ? '<strong style="color: var(--danger);">Full</strong>' : `${evt.spots_left} spots left`}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${isFull ? 'full' : ''}" style="width: ${pct}%;"></div>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn-secondary" onclick="app.viewEventDetails(${evt.id})">Details</button>
            ${!isCancelled ? `
              <button class="btn-primary" ${isFull ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} onclick="app.registerEvent(${evt.id})">
                ${isFull ? 'Full' : 'Register Now'}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Registration Operations (FR-04, FR-05) ---
  async registerEvent(eventId) {
    if (!this.currentUser) {
      this.showModal('login-modal');
      this.toast('Please log in to register for events.', 'info');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register.');

      this.toast(data.message, 'success');
      this.fetchEvents();
      if (document.getElementById('view-my-events').style.display === 'block') {
        this.fetchMyEvents();
      }
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  async cancelRegistration(eventId) {
    if (!confirm('Are you sure you want to cancel your registration?')) return;

    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/register`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel.');

      this.toast(data.message, 'info');
      this.fetchMyEvents();
      this.fetchEvents();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  // --- Attendee Dashboard (FR-06) ---
  async fetchMyEvents() {
    try {
      const res = await fetch(`${API_BASE}/users/me/events`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Render notifications
      const banner = document.getElementById('updates-banner');
      if (data.notifications && data.notifications.length > 0) {
        banner.innerHTML = `
          <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid var(--secondary); padding: 1rem 1.5rem; border-radius: var(--radius);">
            <h4 style="color: var(--secondary); margin-bottom: 0.5rem;"><i class="fa-solid fa-bullhorn"></i> Organizer Announcements</h4>
            ${data.notifications.map(n => `
              <div style="margin-bottom: 0.5rem; font-size: 0.9rem;">
                <strong>[${n.event_title}] ${n.title}:</strong> ${n.message} <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(n.sent_at).toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        banner.innerHTML = '';
      }

      const container = document.getElementById('my-events-list');
      if (data.registrations.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius);">
            <p>You have not registered for any events yet.</p>
            <button class="btn-primary" style="margin-top: 1rem;" onclick="app.navigate('home')">Browse Events</button>
          </div>
        `;
        return;
      }

      container.innerHTML = data.registrations.map(evt => `
        <div class="event-card">
          <span class="event-badge">${evt.category}</span>
          <h3>${evt.title}</h3>
          <div class="event-meta">
            <span><i class="fa-regular fa-calendar"></i> ${evt.date} at ${evt.time}</span>
            <span><i class="fa-solid fa-location-dot"></i> ${evt.location}</span>
            <span><i class="fa-solid fa-badge-check" style="color: var(--success);"></i> Status: <strong>${evt.registration_status.toUpperCase()}</strong></span>
          </div>
          <div class="card-actions" style="margin-top: 1.5rem;">
            ${evt.registration_status === 'confirmed' ? `
              <button class="btn-danger" style="width: 100%;" onclick="app.cancelRegistration(${evt.id})">Cancel Registration</button>
            ` : '<span style="color: var(--text-muted); font-size: 0.85rem;">Registration was cancelled</span>'}
          </div>
        </div>
      `).join('');
    } catch (err) {
      this.toast('Failed to load registered events.', 'error');
    }
  }

  // --- Organizer Studio (FR-07, FR-08, FR-09) ---
  async fetchOrganizerEvents() {
    try {
      const res = await fetch(`${API_BASE}/users/me/organized`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const container = document.getElementById('organizer-events-list');
      if (data.events.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius);">
            <h3>No events created yet</h3>
            <p style="color: var(--text-muted); margin-bottom: 1rem;">Start hosting your first seminar, workshop, or tech talk.</p>
            <button class="btn-primary" onclick="app.showModal('create-event-modal')">Create Event</button>
          </div>
        `;
        return;
      }

      container.innerHTML = data.events.map(evt => `
        <div class="event-card">
          <span class="event-badge">${evt.category}</span>
          <h3>${evt.title}</h3>
          <div class="event-meta">
            <span><i class="fa-regular fa-calendar"></i> ${evt.date} at ${evt.time}</span>
            <span><i class="fa-solid fa-users"></i> Registered: <strong>${evt.registered_count} / ${evt.capacity}</strong></span>
            <span>Status: <strong>${evt.status.toUpperCase()}</strong></span>
          </div>
          <div class="card-actions" style="flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">
            <button class="btn-secondary" onclick="app.viewParticipants(${evt.id})"><i class="fa-solid fa-clipboard-user"></i> Participants</button>
            <button class="btn-secondary" onclick="app.viewRegistrationReport(${evt.id})"><i class="fa-solid fa-file-lines"></i> Report</button>
            <button class="btn-secondary" onclick="app.openBroadcastModal(${evt.id})"><i class="fa-solid fa-bullhorn"></i> Update</button>
            ${evt.status === 'active' ? `
              <button class="btn-danger" onclick="app.cancelEvent(${evt.id})">Cancel</button>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      this.toast('Failed to fetch organized events.', 'error');
    }
  }

  async handleCreateEvent(e) {
    e.preventDefault();
    const eventData = {
      title: document.getElementById('event-title').value,
      category: document.getElementById('event-category').value,
      description: document.getElementById('event-desc').value,
      location: document.getElementById('event-location').value,
      date: document.getElementById('event-date').value,
      time: document.getElementById('event-time').value,
      capacity: document.getElementById('event-capacity').value
    };

    try {
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(eventData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create event.');

      this.hideModal('create-event-modal');
      document.getElementById('create-event-form').reset();
      this.toast('Event published successfully!', 'success');
      this.fetchOrganizerEvents();
      this.fetchEvents();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  async cancelEvent(eventId) {
    if (!confirm('Are you sure you want to cancel this event?')) return;
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.toast(data.message, 'info');
      this.fetchOrganizerEvents();
      this.fetchEvents();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }


  // --- Registration Reports (FR-10) ---
  async viewRegistrationReport(eventId) {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/report`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate report');

      document.getElementById('modal-event-title').innerText = `Registration Report: ${data.event.title}`;
      const body = document.getElementById('modal-event-body');

      body.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <span class="event-badge">${this.escapeHtml(data.event.category)}</span>
            <span style="color: var(--text-muted); font-size: 0.875rem; margin-left: 0.5rem;">
              <i class="fa-regular fa-calendar"></i> ${this.escapeHtml(data.event.date)} at ${this.escapeHtml(data.event.time)} | ${this.escapeHtml(data.event.location)}
            </span>
          </div>
          <button class="btn-primary" onclick="app.downloadReportCSV(${Number(eventId)})" style="padding: 0.4rem 0.8rem; font-size: 0.875rem;">
            <i class="fa-solid fa-download"></i> Download CSV
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem;">
          <div class="stat-card" style="padding: 0.875rem; text-align: center;">
            <div style="color: var(--text-muted); font-size: 0.8rem;">Capacity</div>
            <div style="font-size: 1.35rem; font-weight: 700;">${data.summary.capacity}</div>
          </div>
          <div class="stat-card" style="padding: 0.875rem; text-align: center;">
            <div style="color: var(--text-muted); font-size: 0.8rem;">Confirmed</div>
            <div style="font-size: 1.35rem; font-weight: 700; color: var(--success);">${data.summary.confirmed_count}</div>
          </div>
          <div class="stat-card" style="padding: 0.875rem; text-align: center;">
            <div style="color: var(--text-muted); font-size: 0.8rem;">Cancelled</div>
            <div style="font-size: 1.35rem; font-weight: 700; color: var(--text-muted);">${data.summary.cancelled_count}</div>
          </div>
          <div class="stat-card" style="padding: 0.875rem; text-align: center;">
            <div style="color: var(--text-muted); font-size: 0.8rem;">Available</div>
            <div style="font-size: 1.35rem; font-weight: 700; color: var(--accent);">${data.summary.available_spots}</div>
          </div>
          <div class="stat-card" style="padding: 0.875rem; text-align: center;">
            <div style="color: var(--text-muted); font-size: 0.8rem;">Occupancy</div>
            <div style="font-size: 1.35rem; font-weight: 700; color: var(--primary);">${data.summary.occupancy_rate}%</div>
          </div>
        </div>

        <h4 style="margin-bottom: 0.5rem;">Attendee Roster (${data.attendees.length})</h4>
        ${data.attendees.length === 0 ? '<p style="color: var(--text-muted); margin-top: 0.5rem;">No registrations recorded for this event.</p>' : `
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Reg ID</th>
                  <th>Attendee Name</th>
                  <th>Email</th>
                  <th>Registered At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.attendees.map(a => `
                  <tr>
                    <td>#${a.registration_id}</td>
                    <td><strong>${this.escapeHtml(a.name)}</strong></td>
                    <td>${this.escapeHtml(a.email)}</td>
                    <td>${new Date(a.registered_at).toLocaleString()}</td>
                    <td><span style="color: ${a.status === 'confirmed' ? 'var(--success)' : 'var(--text-muted)'}; font-weight: 600;">${this.escapeHtml(a.status.toUpperCase())}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      `;
      this.showModal('details-modal');
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  async downloadReportCSV(eventId) {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/report?format=csv`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to download report');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-event-${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      this.toast('Report CSV downloaded successfully!', 'success');
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  async viewParticipants(eventId) {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/participants`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      document.getElementById('modal-event-title').innerText = `Participants: ${data.event_title}`;
      const body = document.getElementById('modal-event-body');
      
      body.innerHTML = `
        <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
          <div class="stat-card" style="padding: 1rem; flex: 1;">
            <div>Confirmed</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${data.confirmed_count} / ${data.capacity}</div>
          </div>
          <div class="stat-card" style="padding: 1rem; flex: 1;">
            <div>Cancelled</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-muted);">${data.cancelled_count}</div>
          </div>
        </div>

        <h4>Participant Roster</h4>
        ${data.participants.length === 0 ? '<p style="color: var(--text-muted); margin-top: 0.5rem;">No registered participants yet.</p>' : `
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.participants.map(p => `
                  <tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.email}</td>
                    <td>${new Date(p.registered_at).toLocaleDateString()}</td>
                    <td><span style="color: ${p.status === 'confirmed' ? 'var(--success)' : 'var(--text-muted)'}; font-weight: 600;">${p.status.toUpperCase()}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      `;
      this.showModal('details-modal');
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  openBroadcastModal(eventId) {
    document.getElementById('broadcast-event-id').value = eventId;
    document.getElementById('broadcast-form').reset();
    this.showModal('broadcast-modal');
  }

  async handleSendUpdate(e) {
    e.preventDefault();
    const eventId = document.getElementById('broadcast-event-id').value;
    const title = document.getElementById('broadcast-title').value;
    const message = document.getElementById('broadcast-message').value;

    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ title, message })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.hideModal('broadcast-modal');
      this.toast('Announcement broadcasted to attendees.', 'success');
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  async viewEventDetails(eventId) {
    try {
      const headers = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      const res = await fetch(`${API_BASE}/events/${eventId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const evt = data.event;
      document.getElementById('modal-event-title').innerText = evt.title;
      const body = document.getElementById('modal-event-body');

      body.innerHTML = `
        <span class="event-badge">${evt.category}</span>
        <p style="margin: 1rem 0; color: #cbd5e1; font-size: 1rem; line-height: 1.6;">${evt.description || 'No detailed description.'}</p>
        
        <div style="background: var(--bg-main); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1.5rem;">
          <div style="margin-bottom: 0.5rem;"><i class="fa-regular fa-calendar" style="color: var(--secondary);"></i> <strong>Date & Time:</strong> ${evt.date} at ${evt.time}</div>
          <div style="margin-bottom: 0.5rem;"><i class="fa-solid fa-location-dot" style="color: #ec4899;"></i> <strong>Venue:</strong> ${evt.location}</div>
          <div style="margin-bottom: 0.5rem;"><i class="fa-solid fa-user-tie" style="color: #a78bfa;"></i> <strong>Organizer:</strong> ${evt.organizer_name} (${evt.organizer_email})</div>
          <div><i class="fa-solid fa-users" style="color: var(--success);"></i> <strong>Capacity:</strong> ${evt.registered_count} / ${evt.capacity} spots filled (${evt.spots_left} spots left)</div>
        </div>

        ${evt.updates && evt.updates.length > 0 ? `
          <h4>Event Announcements</h4>
          <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
            ${evt.updates.map(u => `
              <div style="background: rgba(255,255,255,0.03); border-left: 3px solid var(--secondary); padding: 0.75rem 1rem; border-radius: 4px;">
                <strong>${u.title}</strong>
                <p style="font-size: 0.9rem; color: var(--text-muted);">${u.message}</p>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(u.sent_at).toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button class="btn-secondary" onclick="app.hideModal('details-modal')">Close</button>
          ${evt.status === 'active' ? `
            <button class="btn-primary" ${evt.is_full ? 'disabled style="opacity: 0.5;"' : ''} onclick="app.hideModal('details-modal'); app.registerEvent(${evt.id})">
              ${evt.is_full ? 'Event Full' : 'Register for this Event'}
            </button>
          ` : ''}
        </div>
      `;

      this.showModal('details-modal');
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  // --- Admin Console (FR-10, AR-01 to AR-06) ---
  async fetchAdminData() {
    try {
      const [overviewRes, usersRes, reportsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/overview`, { headers: { 'Authorization': `Bearer ${this.token}` } }),
        fetch(`${API_BASE}/admin/users`, { headers: { 'Authorization': `Bearer ${this.token}` } }),
        fetch(`${API_BASE}/admin/reports`, { headers: { 'Authorization': `Bearer ${this.token}` } })
      ]);

      const overview = await overviewRes.json();
      const usersData = await usersRes.json();
      const reportsData = await reportsRes.json();

      // Set stats
      document.getElementById('stat-total-users').innerText = overview.totalUsers;
      document.getElementById('stat-total-orgs').innerText = overview.totalOrganizers;
      document.getElementById('stat-total-events').innerText = overview.totalEvents;
      document.getElementById('stat-total-regs').innerText = overview.totalRegistrations;

      // Set users table
      const usersTable = document.getElementById('admin-users-table');
      usersTable.innerHTML = usersData.users.map(u => `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${u.name}</strong></td>
          <td>${u.email}</td>
          <td>
            <select class="form-control" style="padding: 0.3rem; font-size: 0.85rem;" onchange="app.changeUserRole(${u.id}, this.value)">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>Attendee (user)</option>
              <option value="organizer" ${u.role === 'organizer' ? 'selected' : ''}>Organizer</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td>
            <span style="color: ${u.status === 'active' ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">
              ${u.status.toUpperCase()}
            </span>
          </td>
          <td>
            ${u.id !== this.currentUser.id ? `
              <button class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="app.toggleUserStatus(${u.id}, '${u.status === 'active' ? 'suspended' : 'active'}')">
                ${u.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
            ` : '<span style="font-size: 0.8rem; color: var(--text-muted);">(Current Admin)</span>'}
          </td>
        </tr>
      `).join('');

      // Set reports table
      const reportsTable = document.getElementById('admin-reports-table');
      reportsTable.innerHTML = reportsData.report.map(r => `
        <tr>
          <td><strong>${r.title}</strong></td>
          <td>${r.category}</td>
          <td>${r.organizer_name}</td>
          <td>${r.capacity}</td>
          <td>${r.confirmed_count}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span>${r.occupancy_rate}%</span>
              <div class="progress-track" style="width: 60px; height: 5px;">
                <div class="progress-fill" style="width: ${r.occupancy_rate}%;"></div>
              </div>
            </div>
          </td>
          <td><span style="color: ${r.status === 'active' ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">${r.status.toUpperCase()}</span></td>
          <td>
            <button class="btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="app.adminDeleteEvent(${r.id})">Remove</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      this.toast('Failed to load admin metrics.', 'error');
    }
  }

  async changeUserRole(userId, newRole) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.toast('User role updated.', 'success');
      this.fetchAdminData();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  async toggleUserStatus(userId, newStatus) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.toast(`User ${newStatus}.`, 'info');
      this.fetchAdminData();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  async adminDeleteEvent(eventId) {
    if (!confirm('Are you sure you want to permanently delete this event as administrator?')) return;
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}?hard=true`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.toast(data.message, 'info');
      this.fetchAdminData();
      this.fetchEvents();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  }

  // --- Modals & Toasts ---
  showModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  hideModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'circle-check';
    if (type === 'error') icon = 'circle-exclamation';

    toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

const app = new App();
window.app = app;
