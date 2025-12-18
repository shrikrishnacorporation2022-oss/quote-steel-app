const { google } = require('googleapis');
const stream = require('stream');

/**
 * Uploads a file to Google Drive using a service account.
 * Requires environment variables:
 * - GOOGLE_CLIENT_EMAIL
 * - GOOGLE_PRIVATE_KEY
 * - GOOGLE_DRIVE_FOLDER_ID
 */
async function uploadToDrive(fileBuffer, fileName, mimeType) {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
        console.warn('Google Drive credentials missing. Skipping upload.');
        return null;
    }

    try {
        const auth = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/drive.file']
        );

        const drive = google.drive({ version: 'v3', auth });

        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);

        const fileMetadata = {
            name: fileName,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        };

        const media = {
            mimeType: mimeType,
            body: bufferStream,
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // Make the file readable by anyone with the link (optional, but useful for preview)
        try {
            await drive.permissions.create({
                fileId: response.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
        } catch (permError) {
            console.error('Error setting file permissions:', permError);
        }

        return {
            id: response.data.id,
            link: response.data.webViewLink,
            downloadLink: response.data.webContentLink
        };
    } catch (error) {
        console.error('Google Drive Upload Error:', error);
        return null;
    }
}

module.exports = { uploadToDrive };
