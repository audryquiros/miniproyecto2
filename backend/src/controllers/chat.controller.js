import { orchestrator } from "../services/agents/orchestrator.agent.js";
import { randomUUID } from "node:crypto";
import { query } from "../config/database.js";
import { normalize } from "../services/agents/intent.js";

export async function chat(req, res, next) {
  try {
    const started = performance.now();
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "El campo 'message' es obligatorio.",
      });
    }

    if (message.length > 2000)
      return res
        .status(400)
        .json({
          message: "La consulta debe tener como máximo 2000 caracteres.",
        });
    const conversationId = req.body.conversationId || randomUUID();
    if (
      typeof conversationId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(conversationId)
    )
      return res.status(400).json({ message: "Conversación inválida." });
    const result = await orchestrator(message.trim(), req.user, conversationId);
    const topic =
      [
        "vacaciones",
        "permiso",
        "incapacidad",
        "pago",
        "beneficio",
        "evaluacion",
        "teletrabajo",
      ].find((t) => normalize(message).includes(t)) || "otros";
    await query(
      `INSERT INTO consultas_chat(colaborador_id,conversacion_id,pregunta,respuesta,intencion,agente,documentos_citados,fragmentos_usados,resuelta,escalada,latencia_ms,tema,fecha) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP())`,
      [
        req.user.id,
        conversationId,
        message.trim(),
        result.answer,
        result.intent,
        result.agent,
        JSON.stringify(result.citations || []),
        JSON.stringify(result.fragmentIds || []),
        result.resolved ? 1 : 0,
        result.escalated ? 1 : 0,
        Math.round(performance.now() - started),
        topic,
      ],
    );

    res.json({
      success: true,
      conversationId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
