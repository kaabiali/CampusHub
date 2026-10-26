FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5001
# --preload loads app.py (and trains the model if missing) once in the master, so workers don't race on the model file.
CMD ["gunicorn", "--preload", "-b", "0.0.0.0:5001", "-w", "2", "app:app"]
