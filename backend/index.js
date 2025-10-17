require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

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
      const { User } = require('./models');
      const bcrypt = require('bcryptjs');
      await User.findOneAndUpdate(
        { email: 'jaykayalma@gmail.com' },
        { name: 'Jay Kay Alma', email: 'jaykayalma@gmail.com', password: bcrypt.hashSync('testpass', 10), image: 'pic-2.jpg', reset_token: null, reset_expiry: null },
        { upsert: true, new: true }
      );
      console.log('Test user (jaykayalma@gmail.com) ensured');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api', require('./auth'));
app.use('/api/courses', require('./courses'));

app.get('/', (req, res) => {
  res.send('Apex101 MERN backend running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
