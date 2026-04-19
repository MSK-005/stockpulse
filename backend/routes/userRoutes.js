import express from 'express';
import { createUser, getUser, updateUser, deleteUser, loginUser } from '../controllers/userController.js';

const router = express.Router();

router.post('/register', createUser);
router.post('/login', loginUser);

router.get('/:id', getUser);

router.put('/:id', updateUser);

router.delete('/:id', deleteUser);

export default router;