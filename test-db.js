const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb+srv://idrisolalekann_db_user:Olalekan2025@cluster0.vbizevy.mongodb.net/dating-app?retryWrites=true&w=majority';

console.log('Testing connection...');

mongoose.connect(uri)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    });
