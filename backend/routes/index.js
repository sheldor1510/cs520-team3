const router = require('express').Router();
const User = require('../models/User');
const Interaction = require('../models/Interaction');

router.get('/', async (req, res) => {
    return res.status(200).json({ message: 'API is working!' });
});

router.post('/users', async (req, res) => {
    const { name, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
        return res.status(400).json({ error: 'Name and phone number are required.' });
    }

    try {
        const newUser = new User({ name, phoneNumber });
        const savedUser = await newUser.save();
        return res.status(201).json({ message: 'User created successfully.', user: savedUser });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'User with this phone number already exists.' });
        }
        console.error('Error creating user:', {
            name,
            phoneNumber,
            error: error.message,
            stack: error.stack,
        });

        return res.status(500).json({ error: 'An error occurred while creating the user.' });
    }
});

router.get('/findInteractions', async (req, res) => {
    try {
      const { phoneNumber } = req.query;
  
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
  
      const interactions = await Interaction.find({ userPhoneNumber: phoneNumber });
      res.json(interactions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;