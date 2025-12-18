const https = require('https');
const fs = require('fs');
const key = "AIzaSyACZ2rZ7DTsk_rcGkkiOCqS7Bxqe6Uwvc0";

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            const names = parsed.models.map(m => m.name).join('\n');
            fs.writeFileSync('model-names.txt', names);
            console.log("Written to model-names.txt");
        } catch (e) { console.error(e); }
    });
});
