const Contact = require('../../models/contact');
const sendEmail = require('../../utils/sendEmail');
const logger = require('../../utils/logger');

const submitContactForm = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message, category } = req.body;

    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      source: 'web'
    };

    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
      category,
      metadata
    });

    try {
      await sendEmail({
        email: email,
        subject: 'MEÜMT - İletişim Formunuz Alındı',
        message: `
          Merhaba ${name},
          
          İletişim formunuz başarıyla alınmıştır. En kısa sürede size geri dönüş yapacağız.
          
          Konu: ${subject}
          Kategori: ${category}
          
          Teşekkürler,
          MEÜMT Ekibi
        `
      });
    } catch (emailError) {
      logger.error('Contact confirmation email error:', emailError);
    }

    try {
      await sendEmail({
        email: process.env.ADMIN_EMAIL,
        subject: 'MEÜMT - Yeni İletişim Formu',
        message: `
          Yeni bir iletişim formu alındı:
          
          İsim: ${name}
          E-posta: ${email}
          Telefon: ${phone || 'Belirtilmemiş'}
          Konu: ${subject}
          Kategori: ${category}
          
          Mesaj:
          ${message}
          
          Yönetim panelinden yanıtlayabilirsiniz.
        `
      });
    } catch (emailError) {
      logger.error('Admin notification email error:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Mesajınız başarıyla gönderildi. En kısa sürede size geri dönüş yapacağız.',
      data: { contact: { id: contact._id } }
    });
  } catch (error) {
    logger.error('Submit contact form error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const getContactMessages = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    let query = { isArchived: false };
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    
    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { subject: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .populate('assignedTo', 'firstName lastName avatar')
      .populate('readBy', 'firstName lastName')
      .populate('replies.user', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const pagination = {};

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      pagination,
      data: { contacts }
    });
  } catch (error) {
    logger.error('Get contact messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const getContactMessage = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName avatar email')
      .populate('readBy', 'firstName lastName')
      .populate('replies.user', 'firstName lastName avatar');

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'İletişim mesajı bulunamadı'
      });
    }

    if (!contact.readAt) {
      await contact.markAsRead(req.user.id);
    }

    res.status(200).json({
      success: true,
      data: { contact }
    });
  } catch (error) {
    logger.error('Get contact message error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const updateContactMessage = async (req, res, next) => {
  try {
    let contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'İletişim mesajı bulunamadı'
      });
    }

    const allowedFields = ['status', 'priority', 'assignedTo', 'tags'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    contact = await Contact.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('assignedTo', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      data: { contact }
    });
  } catch (error) {
    logger.error('Update contact message error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

const deleteContactMessage = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'İletişim mesajı bulunamadı'
      });
    }

    contact.isArchived = true;
    await contact.save();

    res.status(200).json({
      success: true,
      message: 'İletişim mesajı arşivlendi'
    });
  } catch (error) {
    logger.error('Delete contact message error:', error);
    res.status(500).json({
      success: false,
      error: 'Sunucu hatası'
    });
  }
};

const replyToContact = async (req, res, next) => {
  try {
    const { message, isInternal = false, sendEmail: shouldSendEmail = true } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Yanıt mesajı gereklidir'
      });
    }

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'İletişim mesajı bulunamadı'
      });
    }

    await contact.addReply(req.user.id, message, isInternal);

    if (!isInternal && shouldSendEmail) {
      try {
        await sendEmail({
          email: contact.email,
          subject: `MEÜMT - ${contact.subject} konulu mesajınıza yanıt`,
          message: `
            Merhaba ${contact.name},
            
            "${contact.subject}" konulu mesajınıza yanıt:
            
            ${message}
            
            Başka sorularınız varsa bizimle iletişime geçebilirsiniz.
            
            Teşekkürler,
            MEÜMT Ekibi
          `
        });
      } catch (emailError) {
        logger.error('Reply email error:', emailError);
      }
    }

    const updatedContact = await Contact.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName avatar')
      .populate('replies.user', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      message: isInternal ? 'İç not eklendi' : 'Yanıt gönderildi',
      data: { contact: updatedContact }
    });
  } catch (error) {
    logger.error('Reply to contact error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  submitContactForm,
  getContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
  replyToContact
}; 