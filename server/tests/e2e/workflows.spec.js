const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const evidenceDirectory = path.resolve(__dirname, '..', '..', '..', '02_Test_Planning', 'evidence');

async function login(page, email, password) {
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Log In to EventHub' });
  await dialog.locator('#login-email').fill(email);
  await dialog.locator('#login-password').fill(password);
  await dialog.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#user-profile-controls')).toBeVisible();
}

async function createEvent(page, title, capacity = 5) {
  const loginResponse = await page.request.post('/api/auth/login', {
    data: { email: 'organizer@ems.com', password: 'Org@123' }
  });
  expect(loginResponse.ok()).toBeTruthy();
  const { token } = await loginResponse.json();
  const response = await page.request.post('/api/events', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title,
      description: 'Playwright workflow event.',
      category: 'Workshop',
      location: 'Automation Hall',
      date: '2027-02-01',
      time: '10:00 AM',
      capacity
    }
  });
  expect(response.status()).toBe(201);
  return (await response.json()).event;
}

test('E2E-01: Browse, search, filter and inspect event details', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.event-card').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Discover, Register & Host Unforgettable Events' })).toBeVisible();

  await page.locator('#category-filter').selectOption('Workshop');
  await expect(page.locator('.event-card').first()).toBeVisible();
  await page.locator('#search-input').fill('no-matching-event-for-this-audit');
  await expect(page.getByRole('heading', { name: 'No events found' })).toBeVisible();

  await page.locator('#search-input').fill('');
  await page.locator('#category-filter').selectOption('All');
  const title = `E2E details ${Date.now()}`;
  const event = await createEvent(page, title);
  await page.reload();
  const card = page.locator('.event-card').filter({ hasText: event.title });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Details' }).click();
  const detailsDialog = page.getByRole('dialog', { name: event.title });
  await expect(detailsDialog).toBeVisible();
  await expect(detailsDialog.getByText(/Venue: Automation Hall/)).toBeVisible();
});

test('E2E-02: Register an account, log in again and log out', async ({ page }) => {
  await page.goto('/');
  const email = `e2e-user-${Date.now()}@example.com`;
  await page.getByRole('button', { name: 'Sign Up' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create an Account' });
  await dialog.locator('#reg-name').fill('Playwright Attendee');
  await dialog.locator('#reg-email').fill(email);
  await dialog.locator('#reg-password').fill('SafePassword123');
  await dialog.getByRole('button', { name: 'Create Account' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#user-display-name')).toHaveText('Playwright Attendee');
  await expect(page.getByRole('button', { name: 'My Registrations' })).toBeVisible();

  await page.getByRole('button', { name: 'Log Out' }).click();
  await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  await login(page, email, 'SafePassword123');
  await expect(page.locator('#user-display-name')).toHaveText('Playwright Attendee');
  await page.getByRole('button', { name: 'Log Out' }).click();
  await expect(page.getByRole('button', { name: 'Log In', exact: true })).toBeVisible();
});

test('E2E-03: Register for and cancel an event from attendee dashboard', async ({ page }) => {
  const event = await createEvent(page, `E2E registration ${Date.now()}`, 2);
  await page.goto('/');
  await login(page, 'likhith@ems.com', 'User@123');
  const card = page.locator('.event-card').filter({ hasText: event.title });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Register Now' }).click();
  await expect(page.getByText(/Registration successful!/)).toBeVisible();

  await page.getByRole('button', { name: 'My Registrations' }).click();
  const registrationCard = page.locator('#my-events-list .event-card').filter({ hasText: event.title });
  await expect(registrationCard).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await registrationCard.getByRole('button', { name: 'Cancel Registration' }).click();
  await expect(page.getByText(/Registration successfully cancelled/)).toBeVisible();
  await expect(registrationCard).toHaveCount(0);
});

test('E2E-04: Organizer creates, edits and cancels an event', async ({ page }, testInfo) => {
  const title = `E2E organizer ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/');
  await login(page, 'organizer@ems.com', 'Org@123');
  await page.getByRole('button', { name: 'Organizer Dashboard' }).click();
  await page.getByRole('button', { name: 'Create New Event' }).click();

  const createDialog = page.getByRole('dialog', { name: 'Host a New Event' });
  await createDialog.locator('#event-title').fill(title);
  await createDialog.locator('#event-category').selectOption('Workshop');
  await createDialog.locator('#event-desc').fill('Created through the browser workflow.');
  await createDialog.locator('#event-location').fill('Organizer Test Hall');
  await createDialog.locator('#event-date').fill('2027-03-15');
  await createDialog.locator('#event-time').fill('11:00 AM');
  await createDialog.locator('#event-capacity').fill('8');
  await createDialog.getByRole('button', { name: 'Publish Event' }).click();
  await expect(createDialog).toBeHidden();

  let eventCard = page.locator('#organizer-events-list .event-card').filter({ hasText: title });
  await expect(eventCard).toBeVisible();
  await eventCard.getByRole('button', { name: /Edit/ }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit Event' });
  await editDialog.locator('#edit-event-title').fill(`${title} edited`);
  await editDialog.getByRole('button', { name: 'Save Changes' }).click();
  await expect(editDialog).toBeHidden();

  eventCard = page.locator('#organizer-events-list .event-card').filter({ hasText: `${title} edited` });
  await expect(eventCard).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await eventCard.getByRole('button', { name: 'Cancel' }).click();
  await expect(eventCard.getByText('CANCELLED')).toBeVisible();

  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDirectory, `organizer-dashboard-${testInfo.project.name}.png`),
    fullPage: true
  });
});

test('E2E-05: Administrator dashboard loads and role changes are accessible and functional', async ({ page }, testInfo) => {
  await page.goto('/');
  await login(page, 'admin@ems.com', 'Admin@123');
  await page.getByRole('button', { name: 'Admin Console' }).click();
  await expect(page.getByRole('heading', { name: 'Platform Users & Roles' })).toBeVisible();
  await expect(page.locator('#stat-total-users')).not.toHaveText('-');

  const attendeeRow = page.locator('#admin-users-table tr').filter({ hasText: 'adil@ems.com' });
  const roleSelect = attendeeRow.locator('select');
  await expect(roleSelect).toHaveAttribute('aria-label', 'Role for Adil Ahmed');
  await roleSelect.selectOption('organizer');
  await expect(page.getByText('User role updated.')).toBeVisible();
  await expect(attendeeRow.locator('select')).toHaveValue('organizer');

  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDirectory, `admin-dashboard-${testInfo.project.name}.png`),
    fullPage: true
  });
});

test('E2E-06: Dialogs support keyboard navigation, Escape and focus restoration', async ({ page }) => {
  await page.goto('/');
  const loginButton = page.getByRole('button', { name: 'Log In', exact: true });
  await loginButton.click();
  const dialog = page.getByRole('dialog', { name: 'Log In to EventHub' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close login dialog' })).toBeFocused();
  await expect(page.locator('#login-modal label[for="login-email"]')).toHaveText('Email Address');

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Log In', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close login dialog' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(loginButton).toBeFocused();
  await expect(page.locator('#toast-container [role="status"], #toast-container [role="alert"]')).toHaveCount(0);
});

test('E2E-07: Event API errors and expired sessions are clearly handled', async ({ page }) => {
  await page.route('**/api/events**', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Service unavailable' })
  }));
  await page.goto('/');
  const errorToast = page.getByRole('alert').getByText('Failed to load events.');
  await expect(errorToast).toBeVisible();

  await page.unroute('**/api/events**');
  await page.addInitScript(() => {
    localStorage.setItem('token', 'invalid-expired-session-token');
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      name: 'Expired Session',
      email: 'expired@example.com',
      role: 'user'
    }));
  });
  await page.reload();
  await expect(page.getByText('Session expired or invalidated. Please sign in again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
});

test('E2E-08: Attendee dashboard displays a loading state while its API request is pending', async ({ page }) => {
  await page.goto('/');
  await login(page, 'likhith@ems.com', 'User@123');
  await page.route('**/api/users/me/events', async route => {
    await new Promise(resolve => setTimeout(resolve, 400));
    await route.continue();
  });
  await page.getByRole('button', { name: 'My Registrations' }).click();
  await expect(page.getByText('Loading your registered events...')).toBeVisible();
  await expect(page.getByText('Loading your registered events...')).toBeHidden();
});

for (const viewport of [
  { width: 375, height: 812, label: 'mobile' },
  { width: 768, height: 1024, label: 'tablet' },
  { width: 1440, height: 1000, label: 'desktop' }
]) {
  test(`RESP-${viewport.width}: Layout, navigation, cards and dialog fit ${viewport.label}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expect(page.locator('.event-card').first()).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

    const toggle = page.getByRole('button', { name: 'Toggle navigation menu' });
    if (viewport.width <= 768) {
      await expect(toggle).toBeVisible();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.getByRole('button', { name: 'Explore Events' }).click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await toggle.click();
    } else {
      await expect(toggle).toBeHidden();
      await expect(page.getByRole('button', { name: 'Explore Events' })).toBeVisible();
    }

    const cardBox = await page.locator('.event-card').first().boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox.width).toBeLessThanOrEqual(viewport.width);
    await page.getByRole('button', { name: 'Log In', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Log In to EventHub' });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.locator('.modal-content').boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width);
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height);

    fs.mkdirSync(evidenceDirectory, { recursive: true });
    await page.keyboard.press('Escape');
    await page.screenshot({
      path: path.join(evidenceDirectory, `catalog-${testInfo.project.name}-${viewport.width}.png`),
      fullPage: true
    });
  });
}
