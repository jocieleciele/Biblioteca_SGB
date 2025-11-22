import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { verifyToken } from "./verify.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configurar storage do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Salvar na pasta frontend/src/capa
    const uploadPath = path.resolve(__dirname, "../../../frontend/src/capa");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Gerar nome único: timestamp + nome original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    // Remover espaços e caracteres especiais
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PNG ou JPG são permitidos!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// POST /api/upload -> Upload de imagem (protegido: bibliotecário/admin)
router.post("/", verifyToken, upload.single('image'), (req, res) => {
  if (req.user.role === "Leitor") {
    return res.status(403).json({ error: "Não autorizado" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  // Retornar o nome do arquivo completo (com extensão) e também sem extensão para compatibilidade
  const fileNameWithExt = req.file.filename;
  const fileNameWithoutExt = path.basename(req.file.filename, path.extname(req.file.filename));
  
  res.json({
    message: "Imagem enviada com sucesso",
    filename: fileNameWithoutExt, // Sem extensão para compatibilidade com banco
    filenameWithExt: fileNameWithExt, // Com extensão para carregar a imagem
    originalName: req.file.originalname,
    path: `/capa/${req.file.filename}`
  });
});

export default router;

