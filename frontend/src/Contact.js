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
        <div className="contact-wrapper form-screen form-screen--plain form-screen--stacked">
          <div className="contact-layout">
            <div className="contact-media">
              <img src={contactImg} alt="Contact us" />
            </div>
            <form onSubmit={handleSubmit} className="form-card form-card--light contact-card">
              <h2 className="form-card__title">Get in touch</h2>
              <p className="form-card__subtitle contact-card__subtitle">
                Tell us how we can help and we&apos;ll reply within one business day.
              </p>
              <div>
                <label htmlFor="contact-name">
                  Your name <span className="required-indicator">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  placeholder="Enter your name"
                  required
                  maxLength={100}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="contact-email">
                  Email address <span className="required-indicator">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  maxLength={100}
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="contact-phone">
                  Phone number <span className="required-indicator">*</span>
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  inputMode="numeric"
                  min="0"
                  max="9999999999"
                  placeholder="Enter your phone number"
                  required
                  maxLength={15}
                  name="number"
                  value={form.number}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="contact-message">
                  Message <span className="required-indicator">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="msg"
                  placeholder="Enter your message"
                  required
                  rows={6}
                  maxLength={1000}
                  value={form.msg}
                  onChange={handleChange}
                />
              </div>
              {message && <div className="form-message success">{message}</div>}
              <div className="form-actions">
                <button type="submit" className="btn" name="submit">
                  Send message
                </button>
              </div>
            </form>
          </div>
          <div className="contact-info-grid">
            <div className="contact-info-card">
              <i className="fas fa-phone"></i>
              <h3>Phone number</h3>
              <a href="tel:0707228850">070 722 8850</a>
              <a href="tel:0115725225">011 572 5225</a>
            </div>
            <div className="contact-info-card">
              <i className="fas fa-envelope"></i>
              <h3>Email address</h3>
              <a href="mailto:jaykayalma@gmail.com">jaykayalma@gmail.com</a>
              <a href="mailto:johnwillisalande@gmail.com">johnwillisalande@gmail.com</a>
            </div>
            <div className="contact-info-card">
              <i className="fas fa-map-marker-alt"></i>
              <h3>Office address</h3>
              <a href="#">Nyeri Rd, Kileleshwa, Nairobi.</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
