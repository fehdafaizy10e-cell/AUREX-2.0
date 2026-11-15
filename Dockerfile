# Use official lightweight Python image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=9645 \
    HOST=0.0.0.0

# Set working directory
WORKDIR /app

# Copy application files (Python standard library only, no extra pip dependencies needed)
COPY server.py index.html style.css script.js ./

# Expose port 9645
EXPOSE 9645

# Healthcheck to verify the server is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:9645/')" || exit 1

# Start the server
CMD ["python", "server.py"]
