import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import authRoutes from './routes/authRoutes';
import orderRoutes from "./routes/orderRoutes";

dotenv.config()

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send("Server is Run")
});

app.use('/api/auth', authRoutes)
app.use("/api", orderRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is run in port ${PORT}`))