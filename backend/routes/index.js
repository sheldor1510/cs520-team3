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

        // Generate a summary of media consumption habits
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
        console.error('Error generating user summary:', {
            phoneNumber,
            error: error.message,
            stack: error.stack,
        });
        return res.status(500).json({ error: 'An error occurred while generating the summary.' });
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

router.post('/newsFeedDigest', async (req, res) => {
    try {
      const { phoneNumber } = req.body;
  
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
  
      const interactions = await Interaction.find({ userPhoneNumber: phoneNumber });
  
      if (!interactions || interactions.length === 0) {
        return res.status(404).json({ message: 'No interactions found for this user.' });
      }
  
      const topicCounts = {};
      interactions.forEach(({ result }) => {
        const words = result.split(/\W+/);
        words.forEach(word => {
          const lower = word.toLowerCase();
          if (lower.length > 3) {
            topicCounts[lower] = (topicCounts[lower] || 0) + 1;
          }
        });
      });
  
      const sortedTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);
  
      res.json({ recommendedTopics: sortedTopics });
      
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
});

router.post('/addInteraction', async (req, res) => {
    const { userPhoneNumber, prompt, link, result } = req.body;

    if (!userPhoneNumber || !prompt || !result) {
        return res.status(400).json({ error: 'User phone number, prompt, and link are required.' });
    }

    try {
        const newInteraction = new Interaction({ userPhoneNumber, link, prompt, result });
        await newInteraction.save();
        return res.status(201).json({ message: 'Interaction added successfully.' });
    } catch (error) {
        console.error('Error adding interaction:', {
            userPhoneNumber,
            prompt,
            link,
            result,
            error: error.message,
            stack: error.stack,
        });

        return res.status(500).json({ error: 'An error occurred while adding the interaction.' });
    }
});


module.exports = router;