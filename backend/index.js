require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Passport initialization
const passport = require('passport');
app.use(passport.initialize());
// If you use sessions:
// app.use(passport.session());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/apex101';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected');
    // Dev seeding for test user
    if (process.env.NODE_ENV === 'development') {
      // FIXED: Your models.js doesn't export a single 'User'
      // This seeding logic will fail. You should seed a 'Student' instead.
      const { Student } = require('./models'); 
      const bcrypt = require('bcryptjs');
      await Student.findOneAndUpdate(
        { email: 'jaykayalma@gmail.com' },
        { 
          name: 'Jay Kay Alma', 
          email: 'jaykayalma@gmail.com', 
          password: bcrypt.hashSync('testpass', 10), 
          image: 'pic-2.jpg', 
          reset_token: null, 
          reset_expiry: null 
        },
        { upsert: true, new: true }
      );
      console.log('Test student (jaykayalma@gmail.com) ensured');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/uploaded_files', express.static(path.join(__dirname, '../uploaded_files')));
app.use('/api/courses', require('./courses'));
app.use('/api', require('./auth'));
app.use('/api/analytics', require('./analytics'));

app.get('/', (req, res) => {
  res.send('Apex101 MERN backend running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
