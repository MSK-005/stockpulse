import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const SALT_ROUNDS = 12;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

function generateToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/users/register
const createUser = async (req, res) => {
  try {
    const { username, email, password, full_name, phone_number } = req.body;

    // Check if username or email already exists
    const existing = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email or username already in use.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, phone_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, username, email, full_name, phone_number, preferred_currency, created_at`,
      [username, email, password_hash, full_name || null, phone_number || null]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.cookie('token', token, cookieOptions);
    res.status(201).json({
      message: 'Account created successfully.',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        preferred_currency: user.preferred_currency,
      },
    });
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/users/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    const token = generateToken(user);
    res.cookie('token', token, cookieOptions);

    res.status(200).json({
      message: 'Logged in successfully.',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        preferred_currency: user.preferred_currency,
      },
    });
  } catch (err) {
    console.error('loginUser error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/users/logout
const logoutUser = (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ message: 'Logged out successfully.' });
};

// GET /api/users/me
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, username, email, full_name, phone_number, preferred_currency, created_at, last_login
       FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/users/:id
const getUser = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, username, email, full_name, phone_number, preferred_currency, created_at, last_login
       FROM users WHERE user_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getUser error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { full_name, phone_number, preferred_currency } = req.body;
    await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone_number = COALESCE($2, phone_number),
           preferred_currency = COALESCE($3, preferred_currency),
           updated_at = NOW()
       WHERE user_id = $4`,
      [full_name, phone_number, preferred_currency, req.params.id]
    );
    res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/users/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    // Always return 200 to prevent user enumeration
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate existing tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [user.user_id]
    );

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, tokenHash, expiresAt]
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'StockPulse — Password Reset Request',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Reset your password</h2>
          <p>Click the link below to reset your StockPulse password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px">
            Reset Password
          </a>
          <p style="color:#666;font-size:13px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/users/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT prt.token_id, prt.user_id
       FROM password_reset_tokens prt
       WHERE prt.token_hash = $1
         AND prt.used = FALSE
         AND prt.expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    const { token_id, user_id } = result.rows[0];
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2', [
      password_hash,
      user_id,
    ]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token_id = $1', [token_id]);

    res.status(200).json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export {
  createUser,
  loginUser,
  logoutUser,
  getMe,
  getUser,
  updateUser,
  deleteUser,
  forgotPassword,
  resetPassword,
};
