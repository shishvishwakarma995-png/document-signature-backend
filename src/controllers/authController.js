import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '7d' }
  );

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).single();
    if (existing)
      return res.status(409).json({ error: 'Email already registered.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashedPassword }])
      .select('id, name, email')
      .single();
    if (error) throw error;

    return res.status(201).json({
      token: generateAccessToken(user),
      refreshToken: generateRefreshToken(user),
      user,
      message: 'Account created!'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required.' });
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, password')
      .eq('email', email)
      .single();
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password.' });

    const safeUser = { id: user.id, name: user.name, email: user.email };
    return res.status(200).json({
      token: generateAccessToken(safeUser),
      refreshToken: generateRefreshToken(safeUser),
      user: safeUser,
      message: 'Login successful.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ error: 'Refresh token required.' });
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    );
    const user = { id: decoded.id, email: decoded.email, name: decoded.name };
    return res.status(200).json({
      token: generateAccessToken(user),
      refreshToken: generateRefreshToken(user),
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
};

export const getMe = async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .eq('id', req.user.id)
    .single();
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.status(200).json({ user });
};