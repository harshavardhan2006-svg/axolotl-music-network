import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { createRateLimit, validateRequest, hallValidation } from "../middleware/security.js";
import { param } from "express-validator";
import {
  playHallSong,
  toggleHallPlayback,
  seekHallPlayback,
  addToHallQueue,
  removeFromHallQueue,
  skipToNext
} from "../controller/hallMusicController.js";

const router = Router();

// Apply rate limiting for music controls
router.use(createRateLimit(60 * 1000, 60)); // 60 requests per minute

// All routes require authentication
router.use(requireAuth());

// Error handling middleware
const handleErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Music control routes with validation
router.post("/:hallId/play", 
  validateRequest(hallValidation.music),
  handleErrors(playHallSong)
);
router.post("/:hallId/toggle", 
  validateRequest([hallValidation.music[0]]), // Just hallId
  handleErrors(toggleHallPlayback)
);
router.post("/:hallId/seek", 
  validateRequest(hallValidation.music),
  handleErrors(seekHallPlayback)
);
router.post("/:hallId/next", 
  validateRequest([hallValidation.music[0]]), // Just hallId
  handleErrors(skipToNext)
);

// Queue management routes with validation
router.post("/:hallId/queue", 
  validateRequest(hallValidation.music),
  handleErrors(addToHallQueue)
);
router.delete("/:hallId/queue/:queueIndex", 
  validateRequest([
    hallValidation.music[0], // hallId
    param('queueIndex').isInt({ min: 0 }).toInt()
  ]),
  handleErrors(removeFromHallQueue)
);

export default router;