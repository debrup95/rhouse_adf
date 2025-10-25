import express, { Request, Response } from 'express';
import { saveUser, User, getUserById, getAllUsers   } from '../../models/auth/userModel';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error: any) {
    console.error('Error:', error.message);
    res.status(500).send(`Failed to fetch users: ${error.message}`);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUserById(parseInt(req.params.id));
    if (user) {
      console.log('User:', user);
      res.status(200).json(user);
    } else {
      console.log('User not found');
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});


router.post('/', async (req: Request, res: Response) => {
  try {
    const user: User = req.body;
    await saveUser(user);
    res.status(201).send('User saved or updated successfully');
  } catch (error : any) {
    console.error('Error:', error);
    res.status(500).send(`Failed to save or update user : ${error.message}`);
  }
});

export default router;
