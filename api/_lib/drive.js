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
        console.warn('Google Drive credentials missing in environment variables.');
        return null;
    }

    // Ultra-robust cleaning of credentials
    const cleanEmail = rawEmail.trim().replace(/^["']/, '').replace(/["']$/, '');
    const cleanFolder = rawFolder.trim().replace(/^["']/, '').replace(/["']$/, '');

    let cleanKey = rawKey.trim();
    // Remove wrapping quotes if present
    if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) || (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
        cleanKey = cleanKey.substring(1, cleanKey.length - 1);
    }
    // Handle literal \n strings (common in Vercel/Env variables)
    cleanKey = cleanKey.replace(/\\n/g, '\n');

    try {
        const auth = new google.auth.JWT(
            cleanEmail,
            null,
            cleanKey,
            ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
        );

        const drive = google.drive({ version: 'v3', auth });

        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);

        const fileMetadata = {
            name: fileName,
            parents: [cleanFolder],
        };

        const media = {
            mimeType: mimeType,
            body: bufferStream,
        };

        // 1. Create the file
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // 2. Set permissions (Make anyone with link a reader)
        try {
            await drive.permissions.create({
                fileId: response.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
        } catch (permError) {
            console.error('Drive: Permission warning (ignorable):', permError.message);
        }

        return {
            id: response.data.id,
            link: response.data.webViewLink,
            downloadLink: response.data.webContentLink
        };
    } catch (error) {
        console.error('Google Drive Upload Error Stack:', error);
        if (error.response && error.response.data) {
            console.error('Detailed Error Data:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

module.exports = { uploadToDrive };
