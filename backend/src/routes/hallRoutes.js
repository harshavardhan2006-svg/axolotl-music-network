import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { upload } from "../middleware/multer.js";
import { createRateLimit, validateRequest, hallValidation } from "../middleware/security.js";
import {
  getMyHalls,
  getHall,
  createHall,
  updateHall,
  deleteHall,
  joinHall,
  leaveHall,
  getPublicHalls
} from "../controller/hallController.js";

const router = Router();

// Apply rate limiting
router.use(createRateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Log all requests
router.use((req, res, next) => {
  console.log(`[Hall Routes] ${req.method} ${req.originalUrl}`);
  next();
});

// All routes require authentication
router.use(requireAuth());

// Error handling middleware
const handleErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Hall CRUD routes with validation
router.get("/my-halls", handleErrors(getMyHalls));
router.get("/discover", handleErrors(getPublicHalls));
router.get("/:hallId",
  validateRequest([hallValidation.update.slice(0, 1)]), // Just hallId validation
  handleErrors(getHall)
);
router.post("/",
  createRateLimit(60 * 1000, 5), // 5 hall creations per minute
  upload.single('coverImage'),
  validateRequest(hallValidation.create),
  handleErrors(createHall)
);
router.put("/:hallId",
  upload.single('coverImage'),
  validateRequest(hallValidation.update),
  handleErrors(updateHall)
);
router.delete("/:hallId",
  validateRequest([hallValidation.update[0]]), // Just hallId validation
  handleErrors(deleteHall)
);

// Hall membership routes with rate limiting
router.post("/:hallId/join",
  createRateLimit(60 * 1000, 10), // 10 joins per minute
  validateRequest([hallValidation.update[0]]),
  handleErrors(joinHall)
);
router.post("/:hallId/leave",
  validateRequest([hallValidation.update[0]]),
  handleErrors(leaveHall)
);

export default router;
