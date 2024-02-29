const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const mysql = require('mysql2')
const dotenv = require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.post('/create-pdf', (req, res) => {
    const { patientName, date, doctorName, medications, notes } = req.body;

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=ordonnance.pdf');
    doc.pipe(res);

    // En-tête
    doc.fontSize(12).text(`Docteur: ${doctorName}`, { align: 'right' });
    doc.fontSize(10).text(`Date: ${date}`, { align: 'right' });
    doc.moveDown();

    // Titre
    doc.fontSize(20).text('Ordonnance Médicale', { align: 'center' });
    doc.moveDown(2);

    // Informations du patient
    doc.fontSize(14).text(`Nom du patient: ${patientName}`);
    doc.moveDown();

    // Médicaments prescrits
    doc.fontSize(14).text('Médicaments Prescrits:');
    doc.fontSize(12).text(medications);
    doc.moveDown();

    // Remarques supplémentaires
    if (notes) {
        doc.fontSize(14).text('Remarques supplémentaires:');
        doc.fontSize(12).text(notes);
        doc.moveDown();
    }
    
    doc.fontSize(14).text('Signature:', { align: 'left' });
    doc.text('____________________', { align: 'left' });
    doc.fontSize(12).text(`Docteur ${doctorName}`, { align: 'left' });

    doc.end();
});

app.post('/create-ordonnance', async (req, res) => {
    const { patientName, date, doctorName, medications, notes } = req.body;
    
    try {
        const pdfPath = await generatePDF(req.body);
        
        const query = `
            INSERT INTO ordonnances 
            (patientName, date, doctorName, medications, notes, pdfPath) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        pool.query(query, [patientName, date, doctorName, medications, notes, pdfPath], (error, results) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }
            res.status(200).json({ message: 'Ordonnance enregistrée avec succès', id: results.insertId });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
