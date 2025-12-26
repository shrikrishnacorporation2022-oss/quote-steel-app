const { google } = require('googleapis');
const stream = require('stream');

/**
 * Uploads a file to Google Drive using a service account.
 */
async function uploadToDrive(fileBuffer, fileName, mimeType) {
    const rawEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const rawFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!rawEmail || !rawKey || !rawFolder) {
        console.warn('Drive: Missing env variables');
        return null;
    }

    // Clean credentials
    const cleanEmail = rawEmail.trim().replace(/^["']/, '').replace(/["']$/, '');

    // Robust Folder ID extraction
    let cleanFolder = rawFolder.trim().replace(/^["']/, '').replace(/["']$/, '');
    if (cleanFolder.includes('drive.google.com')) {
        // Extract ID from URL (handles /folders/ID or ?id=ID)
        const folderMatch = cleanFolder.match(/folders\/([a-zA-Z0-9_-]+)/) || cleanFolder.match(/id=([a-zA-Z0-9_-]+)/);
        if (folderMatch) {
            cleanFolder = folderMatch[1];
        }
    }

    let cleanKey = rawKey.trim();
    if (cleanKey.startsWith('"') || cleanKey.startsWith("'")) cleanKey = cleanKey.substring(1);
    if (cleanKey.endsWith('"') || cleanKey.endsWith("'")) cleanKey = cleanKey.substring(0, cleanKey.length - 1);
    cleanKey = cleanKey.replace(/\\n/g, '\n');

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: cleanEmail,
                private_key: cleanKey,
            },
            scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
        });

        const drive = google.drive({ version: 'v3', auth });

        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);

        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [cleanFolder],
            },
            media: {
                mimeType: mimeType,
                body: bufferStream,
            },
            fields: 'id, webViewLink, webContentLink',
        });

        // Set permissions
        try {
            await drive.permissions.create({
                fileId: response.data.id,
                requestBody: { role: 'reader', type: 'anyone' },
            });
        } catch (e) { }

        return {
            id: response.data.id,
            link: response.data.webViewLink,
            downloadLink: response.data.webContentLink
        };
    } catch (error) {
        console.error('Drive Error:', error.message);
        if (error.response && error.response.status === 404) {
            console.error('Drive Error: Folder not found. Ensure the Folder ID is correct and shared with the service account email as Editor.');
        }
        return null;
    }
}

module.exports = { uploadToDrive };
