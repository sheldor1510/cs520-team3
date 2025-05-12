const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const axios = require('axios');

// Temporary memory store for new users (use a database or Redis in production)
const session = {};

router.post('/', async (req, res) => {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();

  const from = req.body.From;
  const body = req.body.Body.trim();

  if (!session[from]) {
    // First message from user asking for name
    session[from] = { state: 'awaiting_name' };
    twiml.message("Welcome! Please enter your name to begin.");
  } else if (session[from].state === 'awaiting_name') {
    // Got their name → call your /addUser route
    const name = body;

    try {
      await axios.post('http://localhost:3000/addUser', {
        name: name,
        phoneNumber: from
      });

      session[from].state = 'registered';
      twiml.message(`Thanks, ${name}! You’re now registered.`);
    } catch (err) {
      console.error("Failed to register:", err.message);
      twiml.message("Sorry, we couldn't register you. Please try again.");
    }
  } else {
    // Already registered
    twiml.message("You're already registered.");
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

module.exports = router;
