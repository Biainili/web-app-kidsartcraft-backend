import multer from "multer";
import path from "path";
import fs from "fs";

// 📌 Настройки для загрузки файлов
const storage = multer.diskStorage({
  // Папка, куда загружаются файлы
  destination: "uploads/",
  filename: (req, file, cb) => {
    // Уникальное имя файла: timestamp + случайное число + расширение
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 📌 Middleware для загрузки изображений
export const upload = multer({ storage: storage });

// 📌 Функция удаления файлов (если заказ отклонен или завершен)
export const deleteFile = (filePath: string) => {
  fs.unlink(filePath, (err) => {
    console.log("Photo deleted");
    if (err) console.error("Ошибка удаления файла:", err);
  });
};
