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
        return res.status(500).json({ error: 'An error occurred while creating the user.' });
    }
});

module.exports = router;