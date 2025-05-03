import express, { Request, Response } from "express";
import { upload, deleteFile } from "../middleware/fileHandler";
import {
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrdersByUserId,
} from "../models/Orders";
import { authMiddleware } from "../middleware/authMiddleware";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID!;

// 📌 API для создания заказа (СРАЗУ ДОБАВЛЯЕМ В БАЗУ)
router.post(
  "/orders",
  upload.single("orderImg"),
  async (req: Request, res: Response): Promise<void> => {
    // Добавили : Promise<void>
    try {
      const {
        userId,
        username,
        email,
        phone,
        location,
        city,
        address,
        comment,
        size,
        price,
        promoCode,
        orderDate,
        deliveryDate,
        productType,
      } = req.body;
      const orderImg = req.file;

      if (
        !userId ||
        !city ||
        !address ||
        !size ||
        !price ||
        !orderImg ||
        !orderDate ||
        !deliveryDate ||
        !productType
      ) {
        res.status(400).json({ message: "Отсутствуют обязательные поля" }); // ❌ Убрали return, просто вызываем res.json()
        return;
      }

      // 📌 Сначала добавляем заказ в БД со статусом "pending"
      const orderID = await createOrder(
        Number(userId),
        location,
        "pending",
        orderDate,
        deliveryDate,
        productType
      );

      // 📌 Формируем сообщение для Telegram
      const message = `
📦 *Новый заказ!*
🆔 *Order ID:* ${orderID}
🎨 *Тип продукта:* ${productType}
📅 *Дата заказа:* ${orderDate}
📦 *Дата выдачи:* ${deliveryDate}
👤 *Клиент:* ${username} (${email})
📞 *Телефон:* ${phone}
📍 *Локация:* ${location}
🏙 *Город:* ${city}
🏠 *Адрес:* ${address}
💬 *Коментарии:* ${comment}
🎁 *Размер:* ${size}
💰 *Цена:* ${price} руб.
🎟 *Промокод:* ${promoCode || "Нет"}
        `;

      // 📌 Отправляем заказ в Telegram с фото
      await bot.sendPhoto(ADMIN_CHAT_ID, orderImg.path, {
        caption: message,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Подтвердить", callback_data: `confirm_${orderID}` }],
            [{ text: "❌ Отклонить", callback_data: `reject_${orderID}` }],
            [
              {
                text: "🚚 Заказ отправлен",
                callback_data: `shipped_${orderID}`,
              },
            ],
            [
              {
                text: "📦 Заказ завершен",
                callback_data: `completed_${orderID}`,
              },
            ],
          ],
        },
      });

      // 📌 Удаляем файл после отправки в Telegram
      deleteFile(orderImg.path);

      res.status(201).json({ orderID }); // ❌ Убрали return, просто вызываем res.json()
    } catch (error) {
      console.error("Ошибка создания заказа:", error);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  }
);

// 📌 Обработка кнопок Telegram (ОБНОВЛЕНИЕ СТАТУСА И УДАЛЕНИЕ)
bot.on("callback_query", async (query) => {
  const [action, orderID] = query.data!.split("_");

  try {
    if (action === "confirm") {
      await updateOrderStatus(orderID, "confirmed");
      bot.sendMessage(ADMIN_CHAT_ID, `✅ Заказ ${orderID} подтвержден.`);
    }

    if (action === "reject") {
      await deleteOrder(orderID); // Delete the order from the database
      bot.sendMessage(ADMIN_CHAT_ID, `❌ Заказ ${orderID} отклонен и удален.`);
    }

    if (action === "shipped") {
      await updateOrderStatus(orderID, "shipped");
      bot.sendMessage(ADMIN_CHAT_ID, `🚚 Заказ ${orderID} отправлен.`);
    }

    if (action === "completed") {
      await deleteOrder(orderID); // Delete the order from the database
      bot.sendMessage(ADMIN_CHAT_ID, `📦 Заказ ${orderID} завершен и удален.`);
    }

    bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error("Ошибка обработки кнопки Telegram:", error);
    bot.sendMessage(ADMIN_CHAT_ID, `⚠️ Ошибка при обработке заказа ${orderID}`);
  }
});

// router.get("/orders/:id", async (req: Request, res: Response) => {
//     try {
//         const { id } = req.params;
//         const order = await getOrderById(id);

//         if (!order) {
//              res.status(404).json({ message: "Заказ не найден" });
//              return
//         }

//         res.json(order);
//     } catch (error) {
//         console.error("Ошибка при получении заказа:", error);
//         res.status(500).json({ message: "Ошибка сервера" });
//     }
// });

// router.get("/orders/:id", authMiddleware, async (req: Request, res: Response) => {
//     try {
//       const { id } = req.params;
//       const userId = (req as any).user?.id; // ID авторизованного пользователя из middleware

//       if (!userId) {
//          res.status(401).json({ message: "Unauthorized" });
//          return
//       }

//       const order = await getOrderById(id);

//       // ❌ Если заказа нет, отправляем 404
//       if (!order) {
//          res.status(404).json({ message: "Order not found" });
//          return
//       }

//       // 🔒 Проверяем, совпадает ли userId в заказе с текущим пользователем
//       if (order.user_id !== userId) {
//          res.status(403).json({ message: "Access denied" }); // Ошибка доступа
//          return
//       }

//       res.json(order);
//     } catch (error) {
//       console.error("Error receiving order:", error);
//       res.status(500).json({ message: "Server error" });
//     }
//   });

router.get("/orders", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id; // ID авторизованного пользователя

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const orders = await getOrdersByUserId(userId); // 📌 Функция для получения всех заказов пользователя

    res.json(orders);
  } catch (error) {
    console.error("Ошибка получения заказов:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

export default router;
