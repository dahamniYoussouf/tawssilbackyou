export function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err);

  // Si l'erreur a un code de statut, l'utiliser
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // En production, masquer les détails des erreurs 500
  if (status === 500 && process.env.NODE_ENV === "production") {
    return res.status(500).json({ 
      success: false,
      error: "Internal Server Error" 
    });
  }

  // Retourner l'erreur avec le code de statut approprié
  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found" });
}
