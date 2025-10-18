import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export class UploadController {
  /**
   * Upload a single image file
   */
  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      console.log('=== UPLOAD IMAGE REQUEST ===');
      console.log('User:', (req as any).user?.userId);
      console.log('File:', req.file);

      if (!req.file) {
        console.error('❌ No file uploaded');
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
        return;
      }

      // Generate URL for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;

      console.log('✅ File uploaded successfully');
      console.log('File path:', req.file.path);
      console.log('File URL:', fileUrl);
      console.log('File size:', req.file.size, 'bytes');
      console.log('File mimetype:', req.file.mimetype);

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload file'
        }
      });
    }
  }

  /**
   * Delete an uploaded file
   */
  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      console.log('=== DELETE FILE REQUEST ===');
      console.log('Filename:', filename);

      const filePath = path.join(__dirname, '../../uploads', filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('❌ File not found:', filePath);
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found'
          }
        });
        return;
      }

      // Delete the file
      fs.unlinkSync(filePath);
      console.log('✅ File deleted successfully:', filePath);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete file'
        }
      });
    }
  }
}
