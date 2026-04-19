import poolPromise from "../config/db.js";
import sql from "mssql";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const createUser = async (req, res) => {
  try {
    const { username, email, password, full_name, phone_number } = req.body;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const poolPromiseResult = await poolPromise;
    await poolPromiseResult
      .request()
      .input("username", sql.VarChar, username)
      .input("email", sql.VarChar, email)
      .input("password_hash", sql.VarChar, password_hash)
      .input("full_name", sql.VarChar, full_name)
      .input("phone_number", sql.VarChar, phone_number)
      .query(`INSERT INTO Users (username, email, password_hash, full_name, phone_number)
                    VALUES (@username, @email, @password_hash, @full_name, @phone_number)`);
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUser = async (req, res) => {
  try {
    const poolPromiseResult = await poolPromise;
    const user = await poolPromiseResult
      .request()
      .input("id", sql.Int, req.params.id)
      .query(`SELECT user_id, username, email, full_name, phone_number, created_at
                    FROM Users WHERE user_id = @id`);
    if (user.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { full_name, phone_number } = req.body;
    const poolPromiseResult = await poolPromise;
    await poolPromiseResult
      .request()
      .input("id", sql.Int, req.params.id)
      .input("full_name", sql.VarChar, full_name)
      .input("phone_number", sql.VarChar, phone_number)
      .query(`UPDATE Users SET full_name = @full_name, phone_number = @phone_number, 
                    updated_at = GETDATE() WHERE user_id = @id`);
    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const poolPromiseResult = await poolPromise;
    await poolPromiseResult
      .request()
      .input("id", sql.Int, req.params.id)
      .query(`DELETE FROM Users WHERE user_id = @id`);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const poolPromiseResult = await poolPromise;
    const result = await poolPromiseResult
      .request()
      .input("email", sql.VarChar, email)
      .query(`SELECT * FROM Users WHERE email = @email;`);
    const user = result.recordset[0];
    // If email is not found
    if (!user) {
      return res
        .status(401)
        .json({ message: "Email not found. Please sign up" });
    }
    // Checking if passwords match
    if (bcrypt.compareSync(password, user.password_hash)) {
      const token = generateToken(user);
      await poolPromiseResult
        .request()
        .input("email", sql.VarChar, email)
        .query(`UPDATE Users SET last_login = GETDATE() WHERE email = @email`);
      res.status(200).json({
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        preferred_currency: user.preferred_currency,
        user_id: user.user_id,
        token: token,
      });
    } else {
      return res.status(401).json({ message: "Wrong password" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

function generateToken(user) {
  const payload = {
    user_id: user.user_id,
    email: user.email,
  };
  const options = {
    expiresIn: "7d",
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, options);
  return token;
}

export { createUser, getUser, updateUser, deleteUser, loginUser };
