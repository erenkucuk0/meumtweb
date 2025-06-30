const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { setupTestDatabase, clearTestData } = require('./helpers/testHelpers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.TEST_DATABASE_URL = mongoUri;
  await setupTestDatabase();
});

beforeEach(async () => {
  await clearTestData();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.setTimeout(30000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}); 