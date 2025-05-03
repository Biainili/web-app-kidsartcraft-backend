import pool from "../db";

// 📌 Функция генерации 6-символьного кода с префиксом по локации
function generateOrderID(location: string): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Символы для генерации
  let orderID = "";

  // Генерируем 6 случайных символов
  for (let i = 0; i < 6; i++) {
    orderID += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  // Добавляем префикс в зависимости от локации
  let prefix = "XX"; // Значение по умолчанию
  if (location === "Russia") prefix = "RU";
  if (location === "Armenia") prefix = "AM";

  return `${prefix}-${orderID}`; // Пример: RU-7G2ZBX
}

// 📌 Функция проверки уникальности `order_id`
async function generateUniqueOrderID(location: string): Promise<string> {
  let orderID = generateOrderID(location); // Генерируем ID

  // Проверяем, есть ли уже такой `order_id` в БД
  let result = await pool.query(
    `SELECT order_id FROM orders WHERE order_id = $1`,
    [orderID]
  );
  let rowCount: number = result.rowCount ?? 0; // Если `null`, заменяем на `0`

  // Если `order_id` уже существует, генерируем новый, пока не найдем уникальный
  while (rowCount > 0) {
    orderID = generateOrderID(location);
    result = await pool.query(
      `SELECT order_id FROM orders WHERE order_id = $1`,
      [orderID]
    );
    rowCount = result.rowCount ?? 0; // Обновляем `rowCount`, если `null`, заменяем на `0`
  }

  return orderID;
}

// 📌 Функция создания заказа
export async function createOrder(
  userID: number,
  location: string,
  status: string,
  orderDate: string,
  deliveryDate: string,
  productType: string
) {
  try {
    const orderID = await generateUniqueOrderID(location); // Генерируем уникальный ID

    await pool.query(
      `INSERT INTO orders (order_id, user_id, status, order_date, delivery_date, product_type) VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderID, userID, status, orderDate, deliveryDate, productType]
    );

    return orderID; // Возвращаем ID заказа для использования в Telegram-боте
  } catch (error) {
    console.error("Ошибка создания заказа в БД:", error);
    throw error;
  }
}

// 📌 Функция обновления статуса заказа
export async function updateOrderStatus(orderID: string, status: string) {
  try {
    await pool.query(`UPDATE orders SET status = $1 WHERE order_id = $2`, [
      status,
      orderID,
    ]);
  } catch (error) {
    console.error("Ошибка обновления статуса заказа:", error);
    throw error;
  }
}

//  Функция удаления заказа (если отклонен или завершен)
export async function deleteOrder(orderID: string) {
  try {
    await pool.query(`DELETE FROM orders WHERE order_id = $1`, [orderID]);
  } catch (error) {
    console.error("Ошибка удаления заказа:", error);
    throw error;
  }
}

//  Function of receiving an order by ID

export async function getOrdersByUserId(userId: number) {
  try {
    const { rows } = await pool.query(
      `SELECT order_id, status, order_date, delivery_date 
             FROM orders WHERE user_id = $1`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error("Ошибка запроса заказов:", error);
    throw error;
  }
}
