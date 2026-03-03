import { Router, Request, Response } from "express";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

export const pdfUploadRouter = Router();

/**
 * POST /api/upload-pdf
 * 上传 PDF 文件到 S3
 */
pdfUploadRouter.post("/upload-pdf", async (req: Request, res: Response) => {
  try {
    const { fileName, fileData, fileType } = req.body;

    if (!fileName || !fileData || !fileType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!fileName.endsWith(".pdf")) {
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }

    // 验证文件大小（最大 50MB）
    const fileBuffer = Buffer.from(fileData);
    if (fileBuffer.length > 50 * 1024 * 1024) {
      return res.status(400).json({ error: "File size exceeds 50MB limit" });
    }

    // 生成唯一的文件 key
    const timestamp = Date.now();
    const randomId = nanoid(8);
    const fileKey = `${fileType}/${timestamp}-${randomId}-${fileName}`;

    // 上传到 S3
    const { url } = await storagePut(fileKey, fileBuffer, "application/pdf");

    res.json({
      success: true,
      url,
      key: fileKey,
      fileName,
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    res.status(500).json({
      error: "Failed to upload PDF",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
