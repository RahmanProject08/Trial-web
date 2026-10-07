import asyncio
import time

from api.proses_ai import model_rf, model_svm

DATA = "uji koneksi database dari sensor-01"


async def jalankan_paralel():
    mulai = time.time()
    rf, svm = await asyncio.gather(model_rf(DATA), model_svm(DATA))
    return time.time() - mulai, rf, svm


async def jalankan_sekuensial():
    mulai = time.time()
    await model_rf(DATA)
    await model_svm(DATA)
    return time.time() - mulai


async def main():
    waktu_seq = await jalankan_sekuensial()
    waktu_par, rf, svm = await jalankan_paralel()
    print("=== UJI KONKURENSI ASYNC ===")
    print(f"Sekuensial (0.3 + 0.5)   : {waktu_seq:.4f} detik (pembanding, teori 0.8)")
    print(f"Paralel asyncio.gather() : {waktu_par:.4f} detik (teori 0.5)")
    print(f"Hasil RF  : {rf}")
    print(f"Hasil SVM : {svm}")
    lulus = waktu_par <= 0.6
    print(f"Batas <= 0.6 detik : {'LULUS' if lulus else 'GAGAL'}")
    raise SystemExit(0 if lulus else 1)


if __name__ == "__main__":
    asyncio.run(main())
