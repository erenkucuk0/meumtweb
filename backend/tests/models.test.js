const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const CommunityMember = require('../models/CommunityMember');
const WebsiteMembershipApplication = require('../models/WebsiteMembershipApplication');
const Contact = require('../models/Contact');
const Gallery = require('../models/Gallery');
const bcrypt = require('bcryptjs');

const {
  createValidUserData,
  createValidEventData,
  createValidCommunityMemberData,
  createValidWebsiteMembershipData,
  createValidContactData,
  createValidGalleryData,
  createTestUser,
  createTestAdmin,
  connectTestDB,
  closeTestDB
} = require('./helpers/testHelpers');

describe('Model Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Event.deleteMany({});
    await CommunityMember.deleteMany({});
    await WebsiteMembershipApplication.deleteMany({});
    await Contact.deleteMany({});
    await Gallery.deleteMany({});
  });

  describe('User Model', () => {
    it('should create a valid user', async () => {
      const user = await createTestUser();
      expect(user._id).toBeDefined();
      expect(user.email).toBe('test@meumt.edu.tr');
    });

    it('should create a valid admin user', async () => {
      const admin = await createTestAdmin();
      expect(admin._id).toBeDefined();
      expect(admin.role).toBe('admin');
    });

    it('should hash password before saving', async () => {
      const user = await createTestUser();
      const isMatch = await bcrypt.compare('password123', user.password);
      expect(isMatch).toBe(true);
    });

    it('should generate fullName virtual', async () => {
      const user = await createTestUser();
      expect(user.fullName).toBe('Test User');
    });

    it('should validate email format', async () => {
      const invalidUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'password123',
        tcKimlikNo: '12345678901'
      });

      await expect(invalidUser.save()).rejects.toThrow(/email/);
    });

    it('should require either TC Kimlik or Student Number', async () => {
      const invalidUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@meumt.edu.tr',
        password: 'password123'
      });

      await expect(invalidUser.save()).rejects.toThrow(/TC Kimlik/);
    });

    it('should validate TC Kimlik format', async () => {
      const invalidUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@meumt.edu.tr',
        password: 'password123',
        tcKimlikNo: '123'
      });

      await expect(invalidUser.save()).rejects.toThrow(/TC Kimlik/);
    });

    it('should allow user with only student number', async () => {
      const user = await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@meumt.edu.tr',
        password: 'password123',
        studentNumber: '201912345'
      });

      expect(user._id).toBeDefined();
    });

    it('should not update password if not modified', async () => {
      const user = await createTestUser();
      const originalPassword = user.password;

      user.firstName = 'Updated';
      await user.save();

      expect(user.password).toBe(originalPassword);
    });

    it('should match password correctly', async () => {
      const user = await createTestUser();
      const isMatch = await bcrypt.compare('password123', user.password);
      expect(isMatch).toBe(true);
    });
  });

  describe('Event Model', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    const createValidEventData = (organizerId) => ({
      title: 'Test Event',
      description: 'Test event description',
      eventType: 'KONSER',
      date: new Date(),
      time: '19:00',
      location: {
        name: 'Test Location',
        address: 'Test Address'
      },
      capacity: 100,
      organizer: organizerId,
      isPublic: true
    });

    it('should create a valid event', async () => {
      const eventData = createValidEventData(user._id);
      const event = await Event.create(eventData);

      expect(event._id).toBeDefined();
      expect(event.title).toBe('Test Event');
      expect(event.status).toBe('draft');
    });

    it('should require organizer', async () => {
      const eventData = createValidEventData(user._id);
      delete eventData.organizer;

      await expect(Event.create(eventData)).rejects.toThrow(/organizer/);
    });

    it('should require location name', async () => {
      const eventData = createValidEventData(user._id);
      delete eventData.location.name;

      await expect(Event.create(eventData)).rejects.toThrow(/location/);
    });

    it('should require time', async () => {
      const eventData = createValidEventData(user._id);
      delete eventData.time;

      await expect(Event.create(eventData)).rejects.toThrow(/time/);
    });

    it('should validate capacity is positive', async () => {
      const eventData = createValidEventData(user._id);
      eventData.capacity = -1;

      await expect(Event.create(eventData)).rejects.toThrow(/capacity/);
    });

    it('should validate event type enum', async () => {
      const eventData = createValidEventData(user._id);
      eventData.eventType = 'INVALID';

      await expect(Event.create(eventData)).rejects.toThrow(/eventType/);
    });

    it('should default to draft status', async () => {
      const eventData = createValidEventData(user._id);
      delete eventData.status;

      const event = await Event.create(eventData);
      expect(event.status).toBe('draft');
    });

    it('should track registration count', async () => {
      const eventData = createValidEventData(user._id);
      const event = await Event.create(eventData);

      expect(event.registrationCount).toBe(0);
      expect(event.remainingCapacity).toBe(100);
    });
  });

  describe('CommunityMember Model', () => {
    const validMemberData = {
      firstName: 'Test',
      lastName: 'Member',
      tcno: '12345678901',
      studentNumber: '201912345',
      department: 'Computer Engineering',
      email: 'member@meumt.edu.tr',
      phone: '5551234567',
      paymentAmount: 100
    };

    it('should create a valid community member', async () => {
      const member = await CommunityMember.create(validMemberData);
      expect(member._id).toBeDefined();
      expect(member.status).toBe('PENDING');
    });

    it('should validate TC Kimlik format', async () => {
      const invalidMember = new CommunityMember({
        ...validMemberData,
        tcno: '123'
      });

      await expect(invalidMember.save()).rejects.toThrow(/TC Kimlik/);
    });

    it('should validate phone format', async () => {
      const invalidMember = new CommunityMember({
        ...validMemberData,
        phone: '123'
      });

      await expect(invalidMember.save()).rejects.toThrow(/telefon/);
    });

    it('should default to PENDING status', async () => {
      const member = await CommunityMember.create(validMemberData);
      expect(member.status).toBe('PENDING');
    });

    it('should track application source', async () => {
      const member = await CommunityMember.create({
        ...validMemberData,
        applicationSource: 'WEBSITE'
      });

      expect(member.applicationSource).toBe('WEBSITE');
    });
  });

  describe('WebsiteMembershipApplication Model', () => {
    const validApplicationData = {
      firstName: 'Test',
      lastName: 'Applicant',
      email: 'applicant@meumt.edu.tr',
      tcKimlikNo: '12345678901',
      studentNumber: '201912345',
      department: 'Computer Engineering',
      phone: '5551234567'
    };

    it('should create a valid membership application', async () => {
      const application = await WebsiteMembershipApplication.create(validApplicationData);
      expect(application._id).toBeDefined();
      expect(application.applicationStatus).toBe('PENDING');
    });

    it('should validate required fields', async () => {
      const invalidApplication = new WebsiteMembershipApplication({
        firstName: 'Test'
      });

      await expect(invalidApplication.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const invalidApplication = new WebsiteMembershipApplication({
        ...validApplicationData,
        email: 'invalid-email'
      });

      await expect(invalidApplication.save()).rejects.toThrow(/email/);
    });

    it('should approve application', async () => {
      const application = await WebsiteMembershipApplication.create(validApplicationData);
      const admin = await createTestAdmin();

      await application.approve(admin._id, 'Test approval');
      expect(application.applicationStatus).toBe('APPROVED');
      expect(application.approvedBy).toBeDefined();
    });

    it('should reject application', async () => {
      const application = await WebsiteMembershipApplication.create(validApplicationData);
      const admin = await createTestAdmin();

      await application.reject(admin._id, 'Test rejection');
      expect(application.applicationStatus).toBe('REJECTED');
      expect(application.rejectionReason).toBe('Test rejection');
    });
  });

  describe('Contact Model', () => {
    const validContactData = {
      name: 'Test Contact',
      email: 'contact@test.com',
      subject: 'Test Subject',
      message: 'Test message'
    };

    it('should create a valid contact message', async () => {
      const contact = await Contact.create(validContactData);
      expect(contact._id).toBeDefined();
      expect(contact.isRead).toBe(false);
    });

    it('should validate email format', async () => {
      const invalidContact = new Contact({
        ...validContactData,
        email: 'invalid-email'
      });

      await expect(invalidContact.save()).rejects.toThrow(/email/);
    });

    it('should mark as read', async () => {
      const contact = await Contact.create(validContactData);
      contact.isRead = true;
      await contact.save();

      expect(contact.isRead).toBe(true);
    });
  });

  describe('Gallery Model', () => {
    let user;

    beforeEach(async () => {
      user = await createTestUser();
    });

    const validGalleryData = {
      title: 'Test Gallery Item',
      description: 'Test description',
      imageUrl: 'https://example.com/image.jpg',
      category: 'PHOTO',
      uploadedBy: null
    };

    it('should create a valid gallery item', async () => {
      const galleryItem = await Gallery.create({
        ...validGalleryData,
        uploadedBy: user._id
      });

      expect(galleryItem._id).toBeDefined();
      expect(galleryItem.isPublic).toBe(true);
    });

    it('should validate category enum', async () => {
      const invalidGalleryItem = new Gallery({
        ...validGalleryData,
        category: 'INVALID',
        uploadedBy: user._id
      });

      await expect(invalidGalleryItem.save()).rejects.toThrow(/category/);
    });

    it('should default to public visibility', async () => {
      const galleryItem = await Gallery.create({
        ...validGalleryData,
        uploadedBy: user._id
      });

      expect(galleryItem.isPublic).toBe(true);
    });

    it('should require uploaded by field', async () => {
      const invalidGalleryItem = new Gallery(validGalleryData);
      await expect(invalidGalleryItem.save()).rejects.toThrow(/uploadedBy/);
    });
  });

  describe('Model Relationships', () => {
    it('should populate event organizer', async () => {
      const user = await createTestUser();
      const eventData = createValidEventData(user._id);
      const event = await Event.create(eventData);

      const populatedEvent = await Event.findById(event._id).populate('organizer');
      expect(populatedEvent.organizer._id.toString()).toBe(user._id.toString());
    });

    it('should handle cascade delete for events when user is deleted', async () => {
      const user = await createTestUser();
      const eventData = createValidEventData(user._id);
      const event = await Event.create(eventData);

      await User.findByIdAndDelete(user._id);
      const deletedEvent = await Event.findById(event._id);
      expect(deletedEvent).toBeNull();
    });
  });

  describe('Model Indexes', () => {
    it('should enforce unique email for users', async () => {
      await createTestUser();
      await expect(createTestUser()).rejects.toThrow(/duplicate key/);
    });

    it('should enforce unique student number', async () => {
      await createTestUser();
      await expect(
        createTestUser({ email: 'another@meumt.edu.tr', tcKimlikNo: '98765432109' })
      ).rejects.toThrow(/duplicate key/);
    });
  });
}); 