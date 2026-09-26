import { once } from 'node:events';
import zlib from 'node:zlib';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { getRequestMeta } from '../utils/requestMeta';
import { labsService } from './labs.service';
import { vitalsService } from './vitals.service';
import { imagingService, parseOnly } from './imaging.service';

const uuid = z.string().uuid('Invalid reference.');

// HTTP only: parse → delegate → respond. "Whose" is always req.user!.id.

export const listLabReports = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success('Lab reports retrieved.', await labsService.list(req.user!.id)),
  );
});

export const listVitals = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success('Vital signs retrieved.', await vitalsService.list(req.user!.id)),
  );
});

export const listImagingStudies = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    ApiResponseBuilder.success(
      'Imaging studies retrieved.',
      await imagingService.list(req.user!.id),
    ),
  );
});

export const getImagingStudy = asyncHandler(async (req: Request, res: Response) => {
  const study = await imagingService.detail(
    req.user!.id,
    uuid.parse(req.params.studyId),
    getRequestMeta(req),
  );
  res.json(ApiResponseBuilder.success('Imaging study retrieved.', { study }));
});

/**
 * One series as a single streamed response: repeated
 * `[u32 BE instance number][u32 BE byte length][gzip-compressed DICOM]`,
 * centre-out from the key image so the first frame can paint at once.
 *
 * ⚠️ PHI, SO NEVER CACHED: `private, no-store`; `no-transform` also keeps the
 * compression middleware off bytes that are already gzip. Files are decrypted
 * one at a time and written with backpressure, so memory stays flat.
 */
export const streamSeriesFrames = asyncHandler(async (req: Request, res: Response) => {
  const plan = await imagingService.framePlan(
    req.user!.id,
    uuid.parse(req.params.studyId),
    uuid.parse(req.params.seriesId),
    parseOnly(req.query.only),
    getRequestMeta(req),
  );
  // Read the first frame before any header is sent, so an early failure is a
  // clean error response rather than a truncated stream.
  const first =
    plan.frames.length > 0
      ? await imagingService.readFrame(plan.frames[0].storageKey, plan.frames[0].sha256)
      : null;

  res.status(200);
  res.setHeader('Content-Type', 'application/vnd.shri-health.dicom-frames');
  res.setHeader('Content-Length', String(plan.contentLength));
  res.setHeader('Cache-Control', 'private, no-store, no-transform');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  let closed = false;
  res.on('close', () => {
    closed = true;
  });
  try {
    for (let i = 0; i < plan.frames.length; i++) {
      if (closed) return;
      const f = plan.frames[i];
      const body =
        i === 0 && first !== null ? first : await imagingService.readFrame(f.storageKey, f.sha256);
      const header = Buffer.alloc(8);
      header.writeUInt32BE(f.instanceNumber, 0);
      header.writeUInt32BE(body.length, 4);
      if (!res.write(header)) await once(res, 'drain');
      if (!res.write(body)) await once(res, 'drain');
    }
    res.end();
  } catch (err) {
    // Headers are already out: end the connection so the client sees a short
    // body (and re-requests the missing frames) instead of a silent success.
    res.destroy(err as Error);
  }
});

/** One instance as `application/dicom` — the fallback when streaming is unavailable. */
export const getImagingInstance = asyncHandler(async (req: Request, res: Response) => {
  const { gzip } = await imagingService.instance(
    req.user!.id,
    uuid.parse(req.params.studyId),
    uuid.parse(req.params.instanceId),
    getRequestMeta(req),
  );
  const acceptsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));
  const body = acceptsGzip ? gzip : zlib.gunzipSync(gzip);
  res.status(200);
  res.setHeader('Content-Type', 'application/dicom');
  res.setHeader('Content-Length', String(body.length));
  res.setHeader('Cache-Control', 'private, no-store, no-transform');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Accept-Encoding');
  if (acceptsGzip) res.setHeader('Content-Encoding', 'gzip');
  res.end(body);
});
