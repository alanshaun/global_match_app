import { Response } from "express";

export interface ProgressUpdate {
  stage: string;
  progress: number; // 0-100
  message: string;
  data?: any;
}

/**
 * 发送 SSE (Server-Sent Events) 进度更新
 */
export function sendProgressUpdate(
  res: Response,
  update: ProgressUpdate
): void {
  res.write(`data: ${JSON.stringify(update)}\n\n`);
}

/**
 * 初始化 SSE 连接
 */
export function initializeSSE(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
}

/**
 * 关闭 SSE 连接
 */
export function closeSSE(res: Response): void {
  res.write(`data: ${JSON.stringify({ stage: "completed", progress: 100, message: "处理完成" })}\n\n`);
  res.end();
}

/**
 * 处理 SSE 错误
 */
export function sendSSEError(res: Response, error: string): void {
  res.write(`data: ${JSON.stringify({ stage: "error", progress: 0, message: error })}\n\n`);
  res.end();
}
