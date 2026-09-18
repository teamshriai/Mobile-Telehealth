import { Router } from 'express';
import {
  listConversations,
  getConversation,
  sendMessage,
  renameConversation,
  deleteConversation,
} from './ai.controller';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { Permission } from '../config/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// AI Insights router
//
// One permission covers the whole module: a user who may use the assistant may
// read, write and delete their OWN conversations. Splitting that into separate
// read/write permissions would encode a distinction that does not exist —
// there is no role that may read its transcripts but not add to them.
//
// Row-level ownership is enforced in the repository, where every query is
// scoped by userId as well as id. The permission answers "may this role use
// the assistant at all"; it never answers "is this row theirs".
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();
const canUse = requirePermission(Permission.AiInsightsUseOwn);

router.get('/conversations', authenticate, canUse, listConversations);
router.post('/messages', authenticate, canUse, sendMessage);
router.get('/conversations/:id', authenticate, canUse, getConversation);
router.patch('/conversations/:id', authenticate, canUse, renameConversation);
router.delete('/conversations/:id', authenticate, canUse, deleteConversation);

export { router as aiRouter };
