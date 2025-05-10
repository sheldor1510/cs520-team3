const router = require('express').Router();
const User = require('../models/User');
const Interaction = require('../models/Interaction');

router.get('/', async (req, res) => {
    return res.status(200).json({ message: 'API is working!' });
});

router.post('/addUser', async (req, res) => {
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

router.post('/userSummary', async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required.' });
    }

    try {
        const interactions = await Interaction.find({ userPhoneNumber: phoneNumber });

        if (interactions.length === 0) {
            return res.status(404).json({ error: 'No interactions found for this user.' });
        }

        const summary = interactions.reduce((acc, interaction) => {
            const { prompt, result } = interaction;

            if (!acc[prompt]) {
                acc[prompt] = { count: 0, results: [] };
            }

            acc[prompt].count += 1;
            acc[prompt].results.push(result);

            return acc;
        }, {});

        return res.status(200).json({ message: 'Summary generated successfully.', summary });
    } catch (error) {
        console.error('Error generating user summary:', error.message);
        return res.status(500).json({ error: 'An error occurred while generating the summary.' });
    }
});

module.exports = router;