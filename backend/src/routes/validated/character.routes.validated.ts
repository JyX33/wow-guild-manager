import express from "express";
import characterController from "../../controllers/character.controller.js";
import { authenticateJWT } from "../../middleware/auth.middleware.js";
import { validate, ValidateTarget } from "../../middleware/validation.middleware.js";
import {
  characterIdParamSchema,
  characterLookupParamsSchema,
  characterSyncSchema,
  characterSchema
} from "../../schemas/index.js";

const router = express.Router();

// All character routes require authentication
router.use(authenticateJWT);

// Get all characters for the current user
router.get("/", characterController.getUserCharacters);

// Add additional validated routes
router.get(
  "/:characterId",
  validate(characterIdParamSchema, ValidateTarget.PARAMS),
  characterController.getCharacterById
);

router.get(
  "/:region/:realm/:name",
  validate(characterLookupParamsSchema, ValidateTarget.PARAMS),
  characterController.getCharacterByNameRealmRegion
);

router.post(
  "/sync",
  validate(characterSyncSchema, ValidateTarget.BODY),
  characterController.syncCharacter
);

router.post(
  "/",
  validate(characterSchema, ValidateTarget.BODY),
  characterController.createCharacter
);

router.put(
  "/:characterId",
  validate(characterIdParamSchema, ValidateTarget.PARAMS),
  validate(characterSchema, ValidateTarget.BODY),
  characterController.updateCharacter
);

export default router;