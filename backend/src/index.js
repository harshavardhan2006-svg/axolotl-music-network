import express from "express";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer } from "http";
import cron from "node-cron";
import { Server as SocketIOServer } from "socket.io";
import session from "express-session";
import MongoStore from "connect-mongo";
import compression from "compression";

import { initializeSocket } from "./lib/socket-optimized.js";
import { securityHeaders } from "./middleware/security.js";

import { connectDB } from "./lib/db.js";
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statRoutes from "./routes/stat.route.js";
import hallRoutes from "./routes/hallRoutes.js";
import hallChatRoutes from "./routes/hallChatRoutes.js";
import hallMusicRoutes from "./routes/hallMusicRoutes.js";

dotenv.config();

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT;

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
	cors: {
		origin: [
			"http://localhost:3000",
			"https://axolotl-music-network.vercel.app",
			"https://*.vercel.app"
		],
		credentials: true,
	},
});
initializeSocket(io);

// Make io available to routes
app.set('io', io);
app.use((req, res, next) => {
	req.io = io;
	next();
});

// Performance middleware
app.use(compression());

// Request timeout
app.use((req, res, next) => {
	req.setTimeout(30000, () => {
		res.status(408).json({ error: 'Request timeout' });
	});
	next();
});

// Security middleware
app.use(securityHeaders);

app.use(
	cors({
		origin: [
			"http://localhost:3000", 
			"http://localhost:3001",
			"https://axolotl-music-network.vercel.app",
			"https://*.vercel.app"
		],
		credentials: true,
	})
);

// Session middleware for CSRF protection
app.use(session({
	secret: process.env.SESSION_SECRET || 'your-secret-key',
	resave: false,
	saveUninitialized: false,
	store: MongoStore.create({
		mongoUrl: process.env.MONGODB_URI
	}),
	cookie: {
		secure: process.env.NODE_ENV === 'production',
		httpOnly: true,
		maxAge: 24 * 60 * 60 * 1000 // 24 hours
	}
}));

// Generate CSRF token for each session
app.use((req, res, next) => {
	if (!req.session.csrfToken) {
		req.session.csrfToken = Math.random().toString(36).substring(2);
	}
	res.locals.csrfToken = req.session.csrfToken;
	next();
});

app.use(express.json({ limit: '10mb' })); // to parse req.body with size limit
app.use(clerkMiddleware()); // this will add auth to req obj => req.auth

// Hall routes (must be before fileUpload as they use multer)
app.use("/api/halls", hallRoutes);
app.use("/api/hall-chat", hallChatRoutes);
app.use("/api/hall-music", hallMusicRoutes);

app.use(
	fileUpload({
		useTempFiles: true,
		tempFileDir: path.join(__dirname, "tmp"),
		createParentPath: true,
		limits: {
			fileSize: 10 * 1024 * 1024, // 10MB  max file size
		},
	})
);

// cron jobs
const tempDir = path.join(process.cwd(), "tmp");
cron.schedule("0 * * * *", () => {
	if (fs.existsSync(tempDir)) {
		fs.readdir(tempDir, (err, files) => {
			if (err) {
				console.log("error", err);
				return;
			}
			for (const file of files) {
				fs.unlink(path.join(tempDir, file), (err) => { });
			}
		});
	}
});

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statRoutes);

// Health check route
app.get("/api/health", async (req, res) => {
	try {
		// Test database connection
		const mongoose = await import('mongoose');
		const dbStatus = mongoose.default.connection.readyState === 1 ? 'connected' : 'disconnected';
		res.json({ 
			status: "OK", 
			message: "Server is running",
			database: dbStatus,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		res.status(500).json({ status: "ERROR", message: error.message });
	}
});

// Root API route
app.get("/api", (req, res) => {
	res.json({ message: "Axolotl Music Network API", status: "running" });
});

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../frontend/dist")));
	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
	});
}

// error handler
app.use((err, req, res, next) => {
	res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message });
});

httpServer.listen(PORT, async () => {
	console.log("Server is running on port " + PORT);
	try {
		await connectDB();
		console.log("Database connected successfully");
	} catch (error) {
		console.error("Database connection failed:", error);
	}
});
