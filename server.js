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
                Consultation_Reason,
                Consultation_Type
            } = req.body;

            // Base email configuration
            const msg = {
                to: 'bineeth.cp@gmail.com',
                from: 'bineeth.cp@gmail.com',
                subject: `Consultation Request - ${Consultation_Type}`,
                html: `
                    <h2 style="color: #2c5282; text-align: center;">New Consultation Request</h2>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-family: Arial, sans-serif;">
                        <tr style="background-color: #f8f9fa;">
                            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Field</th>
                            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Details</th>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Patient Name</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${Full_Name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Mobile Number</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${Mobile_Number}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">
                                <a href="mailto:${Email}" style="color: #007bff; text-decoration: none;">${Email}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Selected Doctor</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${Selected_Doctor}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Preferred Date</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${Preferred_Date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Preferred Time</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${Preferred_Time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Consultation Reason</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${Consultation_Reason}</td>
                        </tr>
                        ${req.files && req.files.length > 0 ? `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Attachments</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${req.files.length} file(s) attached</td>
                        </tr>` : ''}
                    </table>
                    <p style="text-align: center; margin-top: 20px;">
                        <strong>Thank you for using Swasthya!</strong>
                    </p>
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
