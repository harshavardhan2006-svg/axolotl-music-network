import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { createRateLimit, validateRequest, hallValidation } from "../middleware/security.js";
import { param } from "express-validator";
import {
  getHallMessages,
  sendHallMessage,
  deleteHallMessage
} from "../controller/hallChatController.js";

const router = Router();

// Apply rate limiting
router.use(createRateLimit(15 * 60 * 1000, 200)); // 200 requests per 15 minutes

// All routes require authentication
router.use(requireAuth());

// Error handling middleware
const handleErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Chat routes with validation and rate limiting
router.get("/:hallId/messages",
  validateRequest([hallValidation.update[0]]), // hallId validation
  handleErrors(getHallMessages)
);
router.post("/:hallId/messages",
  createRateLimit(60 * 1000, 30), // 30 messages per minute
  validateRequest(hallValidation.message),
  handleErrors(sendHallMessage)
);
router.delete("/:hallId/messages/:messageId",
  validateRequest([
    hallValidation.update[0], // hallId validation
    param('messageId').isMongoId()
  ]),
  handleErrors(deleteHallMessage)
);

export default router;