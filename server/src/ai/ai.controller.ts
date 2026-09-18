import type { Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from './ai.service';
import { sendMessageSchema, renameConversationSchema, conversationIdSchema } from './ai.validator';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

/** Sending with no conversation id starts a new one — see aiService.sendMessage. */
const sendBodySchema = sendMessageSchema.extend({
  conversationId: z.string().uuid().nullish(),
});

export const listConversations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const conversations = await aiService.listConversations(req.user!.id);
    res.status(200).json(ApiResponseBuilder.success('Conversations retrieved.', { conversations }));
  },
);

export const getConversation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = conversationIdSchema.parse(req.params);
  const conversation = await aiService.getConversation(req.user!.id, id);
  res.status(200).json(ApiResponseBuilder.success('Conversation retrieved.', { conversation }));
});

export const sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { conversationId, content } = sendBodySchema.parse(req.body);
  const result = await aiService.sendMessage(req.user!.id, conversationId ?? null, { content });
  res.status(201).json(ApiResponseBuilder.success('Message sent.', result));
});

export const renameConversation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = conversationIdSchema.parse(req.params);
    const dto = renameConversationSchema.parse(req.body);
    await aiService.rename(req.user!.id, id, dto);
    res.status(200).json(ApiResponseBuilder.success('Conversation renamed.', {}));
  },
);

export const deleteConversation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = conversationIdSchema.parse(req.params);
    await aiService.remove(req.user!.id, id);
    res.status(200).json(ApiResponseBuilder.success('Conversation deleted.', {}));
  },
);
