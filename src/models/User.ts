import pool from "../db";

export interface IUser {
  id: number;
  username: string;
  email: string;
  phone: string;
  location: string;
  password: string;
}

// CreateUser in DB
export async function createUser(
  username: string,
  email: string,
  phone: string,
  location: string,
  hashedPassword: string
) {
  const { rows } = await pool.query(
    "INSERT INTO users (username, email, phone, location, password ) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [username, email, phone, location, hashedPassword]
  );
  return rows[0];
}

// GetUserByEmail in DB
export async function getUserByEmail(email: string) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return rows[0];
}

// GetUserById in DB
export async function getUserById(id: number) {
  const { rows } = await pool.query(
    "SELECT id, username, email, phone, location, password FROM users WHERE id = $1",
    [id]
  );
  if (rows.length === 0) {
    throw new Error("User not found");
  }
  return rows[0];
}

// Update user (username, phone, password)
export async function updateUser(
  id: number,
  username: string,
  phone: string,
  location: string,
  hashedPassword?: string
) {
  if (hashedPassword) {
    await pool.query(
      "UPDATE users SET username = $1, phone = $2, location = $3, password = $4 WHERE id = $5",
      [username, phone, location, hashedPassword, id]
    );
  } else {
    await pool.query(
      "UPDATE users SET username = $1, phone = $2, location = $3 WHERE id = $4",
      [username, phone, location, id]
    );
  }
}
