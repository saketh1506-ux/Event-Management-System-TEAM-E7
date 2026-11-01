const EventModel = require('../models/eventModel');

exports.getAllEvents = (req, res, next) => {
  try {
    const events = EventModel.findAll();
    res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
};

exports.getEventById = (req, res, next) => {
  try {
    const event = EventModel.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    res.status(200).json({ event });
  } catch (error) {
    next(error);
  }
};
