import asyncio
import hashlib
import time

from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

app = FastAPI()

KATA_BAHAYA = ("bahaya", "serang", "attack", "exploit", "breach",
               "injection", "malware", "ancaman")


def buat_prediksi(teks: str, garam: str):
    teks = teks.lower()
    label = "BAHAYA" if any(k in teks for k in KATA_BAHAYA) else "AMAN"
    digest = hashlib.sha256((garam + teks).encode("utf-8")).digest()
    confidence = round(0.80 + (digest[0] / 255) * 0.19, 4)
    return label, confidence


async def model_rf(data_teks: str) -> dict:
    await asyncio.sleep(0.3)
    label, confidence = buat_prediksi(data_teks, "rf")
    return {"model": "Random Forest (RF)", "prediction": label, "confidence": confidence}


async def model_svm(data_teks: str) -> dict:
    await asyncio.sleep(0.5)
    label, confidence = buat_prediksi(data_teks, "svm")
    return {"model": "Support Vector Machine (SVM)", "prediction": label, "confidence": confidence}


@app.get("/api/proses_ai")
async def proses_ai(input_text: str = Query(default="", alias="input")):
    if not input_text.strip():
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "Parameter ?input= wajib diisi"},
        )
    try:
        mulai = time.time()
        hasil_rf, hasil_svm = await asyncio.gather(
            model_rf(input_text),
            model_svm(input_text),
        )
        selesai = time.time()
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Salah satu model gagal: {e}"},
        )
    return {
        "status": "success",
        "duration_seconds": round(selesai - mulai, 4),
        "results": {"model_rf": hasil_rf, "model_svm": hasil_svm},
    }
