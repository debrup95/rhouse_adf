import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import passport from "passport";
// Import logger
import logger from "./utils/logger";

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Main async initialization function
const initializeApp = async () => {
  try {
    // Load configuration first - this must complete before anything else
    logger.info("Initializing application configuration...");
    const { loadConfiguration } = await import("./config");
    const config = await loadConfiguration();
    logger.info("Configuration loaded successfully.");

    // Now that config is loaded, proceed with imports that depend on config
    // Import routes
    const authRoutes = await import("./routes/auth/auth");
    const propertyRoutes = await import("./routes/property/property");
    const savedEstimatesRoutes = await import(
      "./routes/savedEstimates/savedEstimates"
    );
    const underwriteSlidersRoutes = await import(
      "./routes/property/underwriteSliders"
    );
    const specialistRoutes = await import(
      "./routes/specialistCallback/specialistCallback"
    );
    const buyerMatchingRoutes = await import(
      "./routes/buyerMatching/buyerMatching"
    );
    const rehabRoutes = await import("./routes/rehab/rehabRoutes");
    const skipTraceRoutes = await import("./routes/skipTrace/skipTraceRoutes");
    const phoneVerificationRoutes = await import("./routes/phoneVerification/phoneVerificationRoutes");
    const emailVerificationRoutes = await import("./routes/emailVerification/emailVerificationRoutes");
    const paymentRoutes = await import("./routes/paymentRoutes");
    
    const requestRoutes = await import("./routes/requestRoutes");
    const emailRoutes = await import("./routes/emailRoutes");
    const creditRoutes = await import("./routes/creditRoutes");
    const stateInterestRoutes = await import("./routes/stateInterest/stateInterestRoutes");
    const sharedEstimateRoutes = await import("./routes/sharedEstimate/sharedEstimateRoutes");
    logger.info("Imported routes");

    // Import service routers
    const userRouter = await import("./services/auth/userService");
    const estimateRouter = await import("./services/estimate/estimateService");
    logger.info("Imported service routers");

    // Import services for initialization
    const { configureGoogleStrategy } = await import(
      "./services/auth/authService"
    );

    // Import middlewares
    const httpLogger = await import("./middleware/httpLogger");
    const { errorHandler, notFound } = await import(
      "./middleware/errorHandler"
    );

    // Import database initialization and health check
    const runSQLScript = await import("./config/dbInit");
    const { checkDatabaseHealth, closeDatabasePool } = await import("./config/db");
    logger.info("Imported sql script");

    // Constants
    const app = express();
    const NODE_ENV = config.NODE_ENV;
    logger.info(`Express app initialized in Node Env: ${NODE_ENV}`);

    // Initialize Passport and authentication strategies
    configureGoogleStrategy();
    logger.info("Google Strategy Configured");
    app.use(passport.initialize());
    logger.info("Succesfully initialized passport");

    // Middleware
    // Configure CORS with explicit options to handle cross-origin requests
    app.use(
      cors({
        origin: config.CORS_ORIGIN || [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
        ],
        // Allow all origins during development/debugging
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        credentials: true,
      })
    );
    logger.info("CORS configured");
    app.use(httpLogger.default);
    app.use(express.json({ limit: '50mb' }));
    app.use(bodyParser.json({ limit: '50mb' }));

    // Also add a middleware to log all requests for debugging
    app.use((req, res, next) => {
      console.log(`Request received: ${req.method} ${req.path}`);
      next();
    });

    // Routes
    app.use("/api/auth", authRoutes.default);
    app.use("/api/property", propertyRoutes.default);
    app.use("/api/saved-estimates", savedEstimatesRoutes.default);
    app.use("/api/users", userRouter.default);
    app.use("/api/specialist-callback", specialistRoutes.default);
    app.use("/api/estimates", estimateRouter.default);
    app.use("/api/underwrite-sliders", underwriteSlidersRoutes.default);
    app.use("/api/buyer-matching", buyerMatchingRoutes.default);
    app.use("/api/rehab", rehabRoutes.default);
    app.use("/api/skip-trace", skipTraceRoutes.default);
    app.use("/api/phone-verification", phoneVerificationRoutes.default);
    app.use("/api/email-verification", emailVerificationRoutes.default);
    app.use("/api/payments", paymentRoutes.default);
    app.use("/api/requests", requestRoutes.default);
    app.use("/api/email", emailRoutes.default);
    app.use("/api/credits", creditRoutes.default);
    app.use("/api/state-interest", stateInterestRoutes.default);
    app.use("/api/shared-estimates", sharedEstimateRoutes.default);

    app.get("/api/health", async (req: Request, res: Response) => {
      try {
        const dbHealthy = await checkDatabaseHealth();
        res.status(200).json({
          status: "success",
          message: "Server is up and running",
          environment: NODE_ENV,
          timestamp: new Date().toISOString(),
          database: dbHealthy ? "connected" : "disconnected",
        });
      } catch (error) {
        res.status(503).json({
          status: "error",
          message: "Health check failed",
          environment: NODE_ENV,
          timestamp: new Date().toISOString(),
          database: "error",
        });
      }
    });

    // Error handling middleware
    app.use(notFound);
    app.use(errorHandler);

    // Check database connection before starting server
    logger.info("Checking database connection...");
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      logger.error("Database connection failed. Cannot start server.");
      process.exit(1);
    }

    // Initialize database if needed
    // if (false) {
    if(process.env.INITIALIZE_DB === 'true') {
      await runSQLScript.default();
    }

    logger.info("Starting the server...");
    // Start the server
    const PORT = config.PORT;
    const server = app.listen(PORT, () => {
      logger.info(`Server started in ${NODE_ENV} mode on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err: Error) => {
      logger.error("UNHANDLED REJECTION! Shutting down...", { error: err });
      console.error(err);

      // Close server & exit process
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err: Error) => {
      logger.error("UNCAUGHT EXCEPTION! Shutting down...", { error: err });
      console.error(err);

      // Exit process
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received. Shutting down gracefully");
      server.close(async () => {
        await closeDatabasePool();
        logger.info("Process terminated");
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received. Shutting down gracefully");
      server.close(async () => {
        await closeDatabasePool();
        logger.info("Process terminated");
        process.exit(0);
      });
    });

    return server;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to start server: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  }
};

// Start the server
initializeApp().catch((error) => {
  console.error("Failed to initialize application:", error);
  logger.error("Failed to initialize application:", error);
  process.exit(1);
});

export { initializeApp };
