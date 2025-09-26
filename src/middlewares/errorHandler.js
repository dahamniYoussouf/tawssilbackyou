export function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err);

  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({ error: "Internal Server Error" });
  }

  res.status(500).json({
    error: err.message,
    stack: err.stack,
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found" });
}
