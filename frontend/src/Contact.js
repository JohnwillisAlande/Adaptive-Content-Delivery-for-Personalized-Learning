import React, { useState } from 'react';
import './App.css';
import contactImg from './images/contact-img.svg';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', number: '', msg: '' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate message sent (no backend integration)
    setMessage('Message sent successfully!');
    setForm({ name: '', email: '', number: '', msg: '' });
  };

  return (
    <>
      <section className="contact">
        <div className="row">
          <div className="image">
            <img src={contactImg} alt="Contact us" />
          </div>
          <form onSubmit={handleSubmit}>
            <h3>Get in touch</h3>
            <input
              type="text"
              placeholder="Enter your name"
              required
              maxLength="100"
              name="name"
              className="box"
              value={form.name}
              onChange={handleChange}
            />
            <input
              type="email"
              placeholder="Enter your email"
              required
              maxLength="100"
              name="email"
              className="box"
              value={form.email}
              onChange={handleChange}
            />
            <input
              type="number"
              min="0"
              max="9999999999"
              placeholder="Enter your phone number"
              required
              maxLength="10"
              name="number"
              className="box"
              value={form.number}
              onChange={handleChange}
            />
            <textarea
              name="msg"
              className="box"
              placeholder="Enter your message"
              required
              cols="30"
              rows="10"
              maxLength="1000"
              value={form.msg}
              onChange={handleChange}
            ></textarea>
            <input type="submit" value="Send message" className="inline-btn" name="submit" />
            {message && <div className="message form"><span>{message}</span></div>}
          </form>
        </div>
        <div className="box-container">
          <div className="box">
            <i className="fas fa-phone"></i>
            <h3>Phone number</h3>
            <a href="tel:0707228850">070 722 8850</a>
            <a href="tel:0115725225">011 572 5225</a>
          </div>
          <div className="box">
            <i className="fas fa-envelope"></i>
            <h3>Email address</h3>
            <a href="mailto:jaykayalma@gmail.com">jaykayalma@gmail.com</a>
            <a href="mailto:johnwillisalande@gmail.com">johnwillisalande@gmail.com</a>
          </div>
          <div className="box">
            <i className="fas fa-map-marker-alt"></i>
            <h3>Office address</h3>
            <a href="#">Nyeri Rd, Kileleshwa, Nairobi.</a>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
