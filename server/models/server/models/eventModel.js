const db = require('../db');

const EventModel = {
  findAll() {
    return db.prepare('SELECT * FROM events').all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  }
};

module.exports = EventModel;
