import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
        res.status(401).json({ message: "No token, no access" });
        return;
    }

    // ✅ Правильно извлекаем токен (Bearer <token>)
    const token = authHeader.split(" ")[1];

    if (!token) {
        res.status(401).json({ message: "Invalid token format" });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };

        (req as any).user = decoded; // ✅ Теперь `user.id` можно использовать в маршрутах
        next(); // ✅ Передаём управление дальше
    } catch (error) {
        console.log("⛔ Ошибка при проверке токена:", error);
        res.status(401).json({ message: "Invalid token" });
    }
}
