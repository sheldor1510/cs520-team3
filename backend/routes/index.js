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

    return res.status(200).json({ message: 'Validation passed!' });
});

module.exports = router;