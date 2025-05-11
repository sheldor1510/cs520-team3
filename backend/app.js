const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

const mongoURI = process.env.DB_URI

mongoose.connect(mongoURI)
    .then(() => {
        console.log("MongoDB connected.")
    });


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', require('./routes/index.js'));
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

const Interaction = require('./Interaction');

app.post('/newsFeedDigest', async (req, res) => {
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
    interactions.forEach(({ prompt, result }) => {
      const text = `${prompt} ${result}`;
      const words = text.split(/\W+/);
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