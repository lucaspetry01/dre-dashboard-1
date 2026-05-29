import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Endpoint para upload de arquivo
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Aqui você processaria o arquivo XLS
    // Por enquanto, apenas confirmamos o recebimento
    console.log(`Arquivo recebido: ${fileName}`);

    // Limpar arquivo temporário
    fs.unlinkSync(filePath);

    res.json({ 
      success: true, 
      message: 'Arquivo processado com sucesso',
      fileName 
    });
  } catch (error) {
    console.error('Erro ao processar upload:', error);
    res.status(500).json({ error: 'Erro ao processar arquivo' });
  }
});

export default router;
