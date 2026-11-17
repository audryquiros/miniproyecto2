import { orchestrator } from "../services/agents/orchestrator.agent.js";

export async function chat(req, res, next) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "El campo 'message' es obligatorio."
      });
    }

    const result = await orchestrator(message.trim());

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}
