/**
 * Inbound Payload & Route Parameter Validation Middleware (SEC-03)
 *
 * Implements schema-based validation, field-specific sanitization,
 * parameter checking, and role escalation guards.
 */

// Field-specific XSS sanitizer: strips dangerous executable HTML tags, attributes, and URI schemes
// Preserves legitimate punctuation (quotes, apostrophes, ampersands, dashes), emojis, and Unicode
function sanitizeTextField(val) {
  if (typeof val !== 'string') return val;
  return val
    // Remove null bytes
    .replace(/\0/g, '')
    // Strip script elements and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Strip svg, math, iframe, object, embed, applet, style, form tags and dangerous embedded contents
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<\/?(?:svg|math|iframe|object|embed|applet|style|form)\b[^>]*>/gi, '')
    // Strip inline event handler attributes (e.g. onload=, onerror=, onclick=, onmouseover=)
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Strip javascript:, vbscript:, or data: dangerous URI schemes
    .replace(/(?:javascript|vbscript|data):[^\s"']*/gi, '')
    .trim();
}

function isValidCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

/**
 * Validates integer route parameters (e.g. :id)
 * Rejects non-integers, negative numbers, decimals, or injection characters
 */
function validateParams(...paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      const val = req.params[name];
      if (val !== undefined) {
        if (!/^[1-9]\d*$/.test(String(val))) {
          return res.status(400).json({ error: 'Invalid ID parameter.' });
        }
      }
    }
    next();
  };
}

/**
 * Generic schema-based payload validator
 */
function validatePayload(schema) {
  return (req, res, next) => {
    // Body must be a plain JSON object (not an array, primitive, or null)
    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({ error: 'Request body must be a valid JSON object.' });
    }

    // Run schema-specific validation and sanitization
    const result = schema(req.body);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Replace req.body with sanitized and validated data
    req.body = result.data;
    next();
  };
}

// -------------------------------------------------------------
// Validation Schemas
// -------------------------------------------------------------

const authSchemas = {
  register: (body) => {
    const { name, email, password, role } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return { error: 'Name, email, and password are required.' };
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return { error: 'Name, email, and password are required.' };
    }
    // Password must be a string and present
    if (password === undefined || password === null || typeof password !== 'string') {
      return { error: 'Name, email, and password are required.' };
    }

    const trimmedName = sanitizeTextField(name);
    if (trimmedName.length === 0 || trimmedName.length > 100) {
      return { error: 'Name must be between 1 and 100 characters.' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedEmail.length > 254 || !emailRegex.test(trimmedEmail)) {
      return { error: 'Invalid email format.' };
    }

    // Password validation: strictly preserve intact (no trim, no sanitize, no lowercase)
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }
    if (password.length > 128) {
      return { error: 'Password cannot exceed 128 characters.' };
    }

    // Role escalation guard: reject public registration attempts to claim admin role
    if (role !== undefined && role !== null) {
      if (typeof role !== 'string') {
        return { error: 'Invalid role specified.' };
      }
      const normalizedRole = role.trim().toLowerCase();
      if (normalizedRole === 'admin') {
        return { error: 'Invalid role specified. Administrator accounts cannot be registered publicly.' };
      }
      if (normalizedRole !== 'user' && normalizedRole !== 'organizer' && normalizedRole !== '') {
        return { error: 'Invalid role specified.' };
      }
    }

    const assignedRole = (typeof role === 'string' && role.trim().toLowerCase() === 'organizer')
      ? 'organizer'
      : 'user';

    return {
      data: {
        name: trimmedName,
        email: trimmedEmail,
        password, // Preserved byte-for-byte unmodified
        role: assignedRole
      }
    };
  },

  login: (body) => {
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return { error: 'Email and password are required.' };
    }
    if (password === undefined || password === null || typeof password !== 'string') {
      return { error: 'Email and password are required.' };
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail.length > 254) {
      return { error: 'Invalid email or password.' };
    }
    if (password.length > 128) {
      return { error: 'Invalid email or password.' };
    }

    return {
      data: {
        email: trimmedEmail,
        password // Preserved unmodified
      }
    };
  }
};

const eventSchemas = {
  create: (body) => {
    const { title, description, category, location, date, time, capacity } = body;

    if (!title || typeof title !== 'string' || !title.trim() ||
        !location || typeof location !== 'string' || !location.trim() ||
        !date || typeof date !== 'string' || !date.trim() ||
        !time || typeof time !== 'string' || !time.trim() ||
        capacity === undefined || capacity === null) {
      return { error: 'Title, location, date, time, and capacity are required.' };
    }

    const sanitizedTitle = sanitizeTextField(title);
    if (!sanitizedTitle || sanitizedTitle.length > 150) {
      return { error: 'Title must be between 1 and 150 characters.' };
    }

    let sanitizedDescription = '';
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return { error: 'Description must be a text string.' };
      }
      sanitizedDescription = sanitizeTextField(description);
      if (sanitizedDescription.length > 2000) {
        return { error: 'Description cannot exceed 2000 characters.' };
      }
    }

    let sanitizedCategory = 'General';
    if (category !== undefined && category !== null) {
      if (typeof category !== 'string') {
        return { error: 'Category must be a text string.' };
      }
      sanitizedCategory = sanitizeTextField(category);
      if (sanitizedCategory.length > 50) {
        return { error: 'Category cannot exceed 50 characters.' };
      }
    }

    const sanitizedLocation = sanitizeTextField(location);
    if (!sanitizedLocation || sanitizedLocation.length > 200) {
      return { error: 'Location must be between 1 and 200 characters.' };
    }

    const trimmedDate = date.trim();
    if (!isValidCalendarDate(trimmedDate)) {
      return { error: 'Date must be a valid calendar date in YYYY-MM-DD format.' };
    }

    const sanitizedTime = sanitizeTextField(time);
    if (!sanitizedTime || sanitizedTime.length > 50) {
      return { error: 'Time must be between 1 and 50 characters.' };
    }

    const capacityStr = String(capacity).trim();
    if (!/^\d+$/.test(capacityStr) || Number(capacityStr) < 1 || Number(capacityStr) > 100000) {
      return { error: 'Capacity must be a positive integer between 1 and 100000.' };
    }

    return {
      data: {
        title: sanitizedTitle,
        description: sanitizedDescription,
        category: sanitizedCategory || 'General',
        location: sanitizedLocation,
        date: trimmedDate,
        time: sanitizedTime,
        capacity: Number(capacityStr)
      }
    };
  },

  update: (body) => {
    const { title, description, category, location, date, time, capacity, status } = body;
    const data = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return { error: 'Title cannot be empty.' };
      }
      const sanitized = sanitizeTextField(title);
      if (sanitized.length > 150) {
        return { error: 'Title cannot exceed 150 characters.' };
      }
      data.title = sanitized;
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return { error: 'Description must be a text string.' };
      }
      const sanitized = sanitizeTextField(description);
      if (sanitized.length > 2000) {
        return { error: 'Description cannot exceed 2000 characters.' };
      }
      data.description = sanitized;
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || !category.trim()) {
        return { error: 'Category cannot be empty.' };
      }
      const sanitized = sanitizeTextField(category);
      if (sanitized.length > 50) {
        return { error: 'Category cannot exceed 50 characters.' };
      }
      data.category = sanitized;
    }

    if (location !== undefined) {
      if (typeof location !== 'string' || !location.trim()) {
        return { error: 'Location cannot be empty.' };
      }
      const sanitized = sanitizeTextField(location);
      if (sanitized.length > 200) {
        return { error: 'Location cannot exceed 200 characters.' };
      }
      data.location = sanitized;
    }

    if (date !== undefined) {
      if (typeof date !== 'string' || !isValidCalendarDate(date.trim())) {
        return { error: 'Date must be a valid calendar date in YYYY-MM-DD format.' };
      }
      data.date = date.trim();
    }

    if (time !== undefined) {
      if (typeof time !== 'string' || !time.trim()) {
        return { error: 'Time cannot be empty.' };
      }
      const sanitized = sanitizeTextField(time);
      if (sanitized.length > 50) {
        return { error: 'Time cannot exceed 50 characters.' };
      }
      data.time = sanitized;
    }

    if (capacity !== undefined) {
      const capacityStr = String(capacity).trim();
      if (!/^\d+$/.test(capacityStr) || Number(capacityStr) < 1 || Number(capacityStr) > 100000) {
        return { error: 'Capacity must be a positive integer between 1 and 100000.' };
      }
      data.capacity = Number(capacityStr);
    }

    if (status !== undefined) {
      if (typeof status !== 'string' || !['active', 'cancelled'].includes(status.trim())) {
        return { error: 'Invalid event status. Allowed values are: active, cancelled.' };
      }
      data.status = status.trim();
    }

    return { data };
  },

  announcement: (body) => {
    const { title, message } = body;

    if (!title || typeof title !== 'string' || !title.trim() ||
        !message || typeof message !== 'string' || !message.trim()) {
      return { error: 'Update title and message are required and cannot be empty.' };
    }

    const sanitizedTitle = sanitizeTextField(title);
    if (!sanitizedTitle || sanitizedTitle.length > 150) {
      return { error: 'Title must be between 1 and 150 characters.' };
    }

    const sanitizedMessage = sanitizeTextField(message);
    if (!sanitizedMessage || sanitizedMessage.length > 2000) {
      return { error: 'Message must be between 1 and 2000 characters.' };
    }

    return {
      data: {
        title: sanitizedTitle,
        message: sanitizedMessage
      }
    };
  }
};

const adminSchemas = {
  updateRole: (body) => {
    const { role } = body;
    if (!role || typeof role !== 'string' || !['user', 'organizer', 'admin'].includes(role.trim())) {
      return { error: 'Invalid role specified.' };
    }
    return { data: { role: role.trim() } };
  },

  updateStatus: (body) => {
    const { status } = body;
    if (!status || typeof status !== 'string' || !['active', 'suspended'].includes(status.trim())) {
      return { error: 'Invalid status specified.' };
    }
    return { data: { status: status.trim() } };
  }
};

module.exports = {
  sanitizeTextField,
  validateParams,
  validatePayload,
  authSchemas,
  eventSchemas,
  adminSchemas
};
