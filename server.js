const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();

// Updated CORS configuration
app.use(cors());

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 5 // Maximum 5 files per upload
    }
});

// API endpoint for consultation form submission
app.post('/api/submit-consultation', (req, res) => {
    upload.array('attachments', 5)(req, res, async (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File size too large. Maximum size is 5MB per file.'
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: 'Too many files. Maximum is 5 files per upload.'
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: 'Error uploading files.'
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        try {
            const {
                Full_Name,
                Mobile_Number,
                Email,
                Selected_Doctor,
                Preferred_Date,
                Preferred_Time,
                Consultation_Reason
            } = req.body;

            // Base email configuration
            const msg = {
                to: 'bineeth.cp@gmail.com',
                from: 'bineeth.cp@gmail.com',
                subject: 'New Consultation Request from Swasthya',
                html: `
                    <h2>New Consultation Request</h2>
                    <p><strong>Patient Name:</strong> ${Full_Name}</p>
                    <p><strong>Mobile Number:</strong> ${Mobile_Number}</p>
                    <p><strong>Email:</strong> ${Email}</p>
                    <p><strong>Selected Doctor:</strong> ${Selected_Doctor}</p>
                    <p><strong>Preferred Date:</strong> ${Preferred_Date}</p>
                    <p><strong>Preferred Time:</strong> ${Preferred_Time}</p>
                    <p><strong>Consultation Reason:</strong> ${Consultation_Reason}</p>
                    ${req.files && req.files.length > 0 ? 
                        `<p><strong>Attachments:</strong> ${req.files.length} file(s)</p>` : ''}
                `,
                attachments: []
            };

            // Add attachments if files were uploaded
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    msg.attachments.push({
                        content: file.buffer.toString('base64'),
                        filename: file.originalname,
                        type: file.mimetype,
                        disposition: 'attachment'
                    });
                });
            }

            await sgMail.send(msg);
            console.log('Email sent successfully');
            
            res.json({
                success: true,
                message: 'Consultation request submitted successfully'
            });
        } catch (error) {
            console.error('Error sending email:', error);
            if (error.response) {
                console.error(error.response.body);
            }
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to submit consultation request'
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});