import express, { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { createUser, getUserByEmail, getUserById, updateUser } from '../models/User';
import dotenv from "dotenv"
import { authMiddleware } from '../middleware/authMiddleware'

dotenv.config();
const router = express.Router();

// User registration
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, phone, location, password } = req.body;

        // Check if the user exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            res.status(400).json({ message: "Email already registered" });
            return
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a user
        const user = await createUser(username, email, phone, location, hashedPassword);

        res.status(201).json({ message: "Registration successful", user });
    } catch (error) {
        console.error("Ошибка регистрации:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


// User Login 
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Check if the user exists
        const user = await getUserByEmail(email);
        if (!user) {
            res.status(400).json({ message: 'Incorrect email or password' });
            return
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Incorrect email or password' })
            return
        }

        // Create a JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        res.json({ message: 'Login completed', token })

    } catch (error) {
        res.status(500).json({ message: 'Server error' })
    }
})


// Check Authorization
router.get('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const user = await getUserById(userId);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return
        }

        res.json({ id: user.id, username: user.username, email: user.email, phone: user.phone, location: user.location });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
})


// UpDate Profile
router.put('/update-profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, phone, location, currentPassword, newPassword } = req.body;
        const userId = (req as any).user.id;

        // Check if the user exists
        const user = await getUserById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return
        };

        // If `new Password` is passed, check the current password
        if (newPassword) {
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

            if (!isPasswordValid) {
                res.status(400).json({ message: 'Incorrect current password' });
                return
            }

            // Hash the new password before updating
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await updateUser(userId, username, phone, location, hashedPassword);
        } else {
            // Update only username and phone (if `newPassword` is not passed)
            await updateUser(userId, username, phone, location);
        }

        // Return updated data
        const updatedUser = await getUserById(userId);
        res.status(200).json({
            message: 'Profile updated successfully',
            user: { username: updatedUser.username, email: updatedUser.email, phone: updatedUser.phone, location: updatedUser.location }
        });

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Server error" });
    }
})

export default router;