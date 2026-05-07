import express from 'express';
import {
  createUser,
  loginUser,
  logoutUser,
  getMe,
  getUser,
  updateUser,
  deleteUser,
  forgotPassword,
  resetPassword,
} from '../controllers/userController.js';
import { verifyToken, verifySelf } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema, updateUserSchema, forgotPasswordSchema, resetPasswordSchema } from '../middleware/validate.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), createUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/logout', logoutUser);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Protected routes
router.get('/me', verifyToken, getMe);
router.get('/:id', verifyToken, verifySelf, getUser);
router.put('/:id', verifyToken, verifySelf, validate(updateUserSchema), updateUser);
router.delete('/:id', verifyToken, verifySelf, deleteUser);

export default router;
