const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/User');
const app = require('../app'); // Import the app to test the endpoint
require('dotenv').config();
const Interaction = require('../models/Interaction');

let connection;

beforeAll(async () => {
  // Use a separate connection for testing
  const MONGO_URI = process.env.TEST_DB_URI; // Use the test database URI
  connection = await mongoose.createConnection(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Set the connection for the User model
  mongoose.connection = connection;
});

beforeEach(async () => {
  // Clear the User collection before each test
  await User.deleteMany({});
});

afterAll(async () => {
  // Drop the test database and close the connection
  await connection.dropDatabase();
  await connection.close();
});

describe('POST /addUser', () => {
  it('should create a new user with valid input', async () => {
    const res = await request(app)
      .post('/addUser')
      .send({
        name: 'Test User',
        phoneNumber: '+1234567890',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'User created successfully.');
    expect(res.body.user).toHaveProperty('name', 'Test User');
    expect(res.body.user).toHaveProperty('phoneNumber', '+1234567890');
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/addUser')
      .send({ name: 'Missing Phone Number' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Name and phone number are required.');
  });

  it('should return 409 if phone number already exists', async () => {
    // Create a user with the same phone number
    await request(app)
      .post('/addUser')
      .send({
        name: 'Existing User',
        phoneNumber: '+1234567890',
      });

    // Attempt to create another user with the same phone number
    const res = await request(app)
      .post('/addUser')
      .send({
        name: 'Duplicate User',
        phoneNumber: '+1234567890',
      });

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('error', 'User with this phone number already exists.');
  });

  it('should return 500 and log error if saving user fails', async () => {
    // Spy on console.error to confirm it logs
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Force User.prototype.save to throw
    const saveMock = jest
      .spyOn(User.prototype, 'save')
      .mockImplementationOnce(() => {
        throw new Error('Simulated DB failure');
      });

    const res = await request(app)
      .post('/addUser')
      .send({
        name: 'Failing User',
        phoneNumber: '+19999999999',
      });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('error', 'An error occurred while creating the user.');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error creating user:',
      expect.objectContaining({
        name: 'Failing User',
        phoneNumber: '+19999999999',
        error: 'Simulated DB failure',
        stack: expect.any(String)
      })
    );

    // Clean up mocks
    consoleSpy.mockRestore();
    saveMock.mockRestore();
  });

});

describe('POST /userSummary', () => {
  it('should return 400 if phone number is missing', async () => {
    const res = await request(app).post('/userSummary').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Phone number is required.');
  });

  it('should return 404 if no interactions are found', async () => {
    const res = await request(app).post('/userSummary').send({
      phoneNumber: '+00000000000',
    });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error', 'No interactions found for this user.');
  });

  it('should return 200 and a correct summary if interactions exist', async () => {
    const phoneNumber = '+99999999999';

    await Interaction.create([
      {
        userPhoneNumber: phoneNumber,
        prompt: 'source_check',
        link: 'https://example.com/a',
        result: 'Credible',
      },
      {
        userPhoneNumber: phoneNumber,
        prompt: 'source_check',
        link: 'https://example.com/b',
        result: 'Some bias detected',
      },
      {
        userPhoneNumber: phoneNumber,
        prompt: 'bias_sentiment',
        link: 'https://example.com/c',
        result: 'Leaning left',
      },
    ]);

    const res = await request(app)
      .post('/userSummary')
      .send({ phoneNumber });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Summary generated successfully.');
    expect(res.body.summary).toMatchObject({
      source_check: {
        count: 2,
        results: expect.arrayContaining(['Credible', 'Some bias detected']),
      },
      bias_sentiment: {
        count: 1,
        results: ['Leaning left'],
      },
    });
  });

  it('should return 500 and log error if Interaction.find throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const findMock = jest.spyOn(Interaction, 'find').mockImplementationOnce(() => {
      throw new Error('Simulated DB failure');
    });

    const res = await request(app).post('/userSummary').send({
      phoneNumber: '+88888888888',
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('error', 'An error occurred while generating the summary.');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error generating user summary:',
      expect.objectContaining({
        phoneNumber: '+88888888888',
        error: 'Simulated DB failure',
        stack: expect.any(String),
      })
    );

    findMock.mockRestore();
    consoleSpy.mockRestore();
  });
});


describe('GET /findInteractions', () => {
  it('should return 400 if phone number is missing', async () => {
    const res = await request(app).get('/findInteractions');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Phone number is required');
  });

  it('should return an empty array if no interactions are found', async () => {
    const res = await request(app).get('/findInteractions').query({
      phoneNumber: '+00000000000',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('should return a list of interactions for a valid phone number', async () => {
    const phoneNumber = '+11111111111';

    await Interaction.create([
      {
        userPhoneNumber: phoneNumber,
        prompt: 'bias_sentiment',
        link: 'https://example.com/news',
        result: 'Neutral',
      },
    ]);

    const res = await request(app).get('/findInteractions').query({ phoneNumber });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty('userPhoneNumber', phoneNumber);
    expect(res.body[0]).toHaveProperty('result', 'Neutral');
  });

  it('should return 500 and log error if Interaction.find fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const findMock = jest.spyOn(Interaction, 'find').mockImplementationOnce(() => {
      throw new Error('Simulated DB failure');
    });

    const res = await request(app).get('/findInteractions').query({
      phoneNumber: '+22222222222',
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('error', 'Server error');
    expect(consoleSpy).toHaveBeenCalled();

    findMock.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe('POST /newsFeedDigest', () => {
  it('should return 400 if phone number is missing', async () => {
    const res = await request(app).post('/newsFeedDigest').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Phone number is required');
  });

  it('should return 404 if no interactions are found', async () => {
    const res = await request(app).post('/newsFeedDigest').send({
      phoneNumber: '+33333333333',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message', 'No interactions found for this user.');
  });

  it('should return recommended topics based on interaction results', async () => {
    const phoneNumber = '+44444444444';

    await Interaction.create([
      {
        userPhoneNumber: phoneNumber,
        prompt: 'bias_sentiment',
        link: 'https://example.com/1',
        result: 'Climate change policy is controversial and debated',
      },
      {
        userPhoneNumber: phoneNumber,
        prompt: 'bias_sentiment',
        link: 'https://example.com/2',
        result: 'Policy experts disagree on climate change impact',
      },
    ]);

    const res = await request(app).post('/newsFeedDigest').send({ phoneNumber });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('recommendedTopics');
    expect(Array.isArray(res.body.recommendedTopics)).toBe(true);
    expect(res.body.recommendedTopics.length).toBeGreaterThan(0);
    expect(res.body.recommendedTopics).toContain('climate');
    expect(res.body.recommendedTopics).toContain('policy');
  });

  it('should return 500 and log error if Interaction.find fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const findMock = jest.spyOn(Interaction, 'find').mockImplementationOnce(() => {
      throw new Error('Simulated DB failure');
    });

    const res = await request(app).post('/newsFeedDigest').send({
      phoneNumber: '+55555555555',
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('error', 'Server error');
    expect(consoleSpy).toHaveBeenCalled();

    findMock.mockRestore();
    consoleSpy.mockRestore();
  });

})

describe('POST /addInteraction', () => {
  it('should return 400 if required fields are missing', async () => {
    const res = await request(app).post('/addInteraction').send({
      userPhoneNumber: '+1234567890',
      prompt: 'bias_sentiment',
      // missing result
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'User phone number, prompt, and link are required.');
  });
});
