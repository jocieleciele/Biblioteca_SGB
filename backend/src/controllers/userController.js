export const listUsers = async (req, res) => {
  try {
    const r = await req.db.query("SELECT id, name, email, role FROM users ORDER BY name");
    res.json({ users: r.rows });
  } catch (err) {
    console.error("Erro listUsers:", err);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
};
