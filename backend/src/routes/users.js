import express from 'express'
import { verifyToken } from './verify.js'
import bcrypt from 'bcryptjs'

const router = express.Router()

// GET users -> Listar todos os usuários (protegido: bibliotecário/admin)
router.get('/', verifyToken, async (req, res) => {
  if (req.user.role === 'Leitor') {
    return res.status(403).json({ error: 'Não autorizado' })
  }

  try {
    const r = await req.db.query(
      'SELECT id, name, email, role, created_at, active FROM users ORDER BY name'
    )
    res.json({ users: r.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar usuários' })
  }
})

// GET /api/users/:id -> Buscar usuário por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params
  const uid = parseInt(id, 10)

  // Apenas o próprio usuário ou bibliotecário/admin podem ver
  if (req.user.id !== uid && req.user.role === 'Leitor') {
    return res.status(403).json({ error: 'Não autorizado' })
  }

  try {
    const r = await req.db.query(
      'SELECT id, name, email, role, created_at, active FROM users WHERE id = $1',
      [uid]
    )

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    res.json({ user: r.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar usuário' })
  }
})

// PUT /api/users/:id -> Atualizar usuário
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params
  const uid = parseInt(id, 10)
  const { name, email, password, role } = req.body
  const db = req.db

  // Verificar autorização
  const podeEditar = req.user.id === uid || 
                     req.user.role === 'Administrador' || 
                     ((req.user.role === 'Bibliotecario' || req.user.role === 'Bibliotecário') && req.user.id !== uid)

  if (!podeEditar) {
    return res.status(403).json({ error: 'Não autorizado' })
  }

  // Apenas administradores podem alterar roles
  if (role && req.user.role !== 'Administrador') {
    return res.status(403).json({ error: 'Apenas administradores podem alterar perfis' })
  }

  try {
    // Verificar se usuário existe
    const existing = await db.query('SELECT * FROM users WHERE id = $1', [uid])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    // Verificar se email já está em uso por outro usuário
    if (email && email !== existing.rows[0].email) {
      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [email])
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'E-mail já está em uso' })
      }
    }

    // Construir query de atualização
    const updateFields = []
    const values = []
    let paramIndex = 1

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`)
      values.push(name)
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`)
      values.push(email)
    }
    if (password !== undefined) {
      const hashed = await bcrypt.hash(password, 10)
      updateFields.push(`password = $${paramIndex++}`)
      values.push(hashed)
    }
    if (role !== undefined && req.user.role === 'Administrador') {
      updateFields.push(`role = $${paramIndex++}`)
      values.push(role)
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(uid)
    updateFields.push(`id = $${paramIndex}`)

    const result = await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, email, role, created_at, active`,
      values
    )

    res.json({ message: 'Usuário atualizado com sucesso!', user: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar usuário' })
  }
})

// DELETE /api/users/:id -> Excluir usuário (hard delete)
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params
  const uid = parseInt(id, 10)
  const db = req.db

  // Apenas administradores podem excluir usuários
  if (req.user.role !== 'Administrador') {
    return res.status(403).json({ error: 'Apenas administradores podem excluir usuários' })
  }

  // Não permitir auto-exclusão
  if (req.user.id === uid) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta' })
  }

  try {
    // Verificar se usuário existe
    const existing = await db.query('SELECT * FROM users WHERE id = $1', [uid])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' })
    }

    // Verificar se há empréstimos ativos
    const emprestimosAtivos = await db.query(
      'SELECT COUNT(*) as count FROM emprestimos WHERE usuario_id = $1 AND data_devolucao IS NULL',
      [uid]
    )

    if (parseInt(emprestimosAtivos.rows[0].count) > 0) {
      return res.status(400).json({
        message: 'Não é possível excluir usuário com empréstimos ativos. Primeiro devolva todos os materiais.',
      })
    }

    // Obter um client do pool para transação
    const client = await db.connect()

    try {
      // Iniciar transação
      await client.query('BEGIN')

      // Excluir registros relacionados (em ordem para respeitar foreign keys)
      // 1. Excluir pagamentos (referencia multas e users)
      await client.query('DELETE FROM pagamentos WHERE usuario_id = $1', [uid])
      
      // 2. Excluir multas (referencia emprestimos e users)
      await client.query('DELETE FROM multas WHERE usuario_id = $1', [uid])
      
      // 3. Excluir recomendações (referencia users e materials)
      await client.query('DELETE FROM recomendacoes WHERE usuario_id = $1', [uid])
      
      // 4. Excluir reservas (referencia users e materials)
      await client.query('DELETE FROM reservas WHERE usuario_id = $1', [uid])
      
      // 5. Excluir empréstimos (referencia users e materials)
      // Nota: empréstimos já devolvidos podem ser excluídos, mas verificamos antes se há ativos
      await client.query('DELETE FROM emprestimos WHERE usuario_id = $1', [uid])
      
      // 6. Finalmente, excluir o usuário
      await client.query('DELETE FROM users WHERE id = $1', [uid])

      // Confirmar transação
      await client.query('COMMIT')

      res.json({ message: 'Usuário excluído permanentemente com sucesso!' })
    } catch (deleteErr) {
      // Reverter transação em caso de erro
      await client.query('ROLLBACK')
      throw deleteErr
    } finally {
      // Sempre liberar o client
      client.release()
    }
  } catch (err) {
    console.error("Erro ao excluir usuário:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ 
      error: 'Erro ao excluir usuário',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
})

export default router


