# Calca los maniquíes de referencia: contornos visibles de cada parte (con sus oclusiones) y la trama
# de luz, en las coordenadas del viewBox de cada lámina. Escribe sc4/js/bocetos-ref.js.
import asyncio, base64, json, math, random
import numpy as np
from skimage import measure, morphology
from playwright.async_api import async_playwright

ESC = 4  # píxeles por unidad del viewBox
LAMINAS = {  # nombre: (x0, y0, ancho, alto) de la zona de la figura en el viewBox
    "lobo": (0, 4, 124, 196),
    "vampiro": (0, 16, 120, 186),
    "murcielago": (0, -34, 240, 150),
}
L = np.array([-0.45, 0.55, 0.7]); L /= np.linalg.norm(L)

def capas_de(nombre):
    # a lo Leonardo: trazos cortos y paralelos en diagonal, de zurdo (de arriba a la izquierda hacia abajo a
    # la derecha); el tono sube con capas casi paralelas, no con tramas cruzadas
    return {"lobo": [(0.8, 0.14), (0.95, 0.42), (0.68, 0.7)], "vampiro": [(0.85, 0.12), (1.0, 0.45), (0.72, 0.75)], "murcielago": [(0.8, 0.18), (0.95, 0.5)]}[nombre]

def tramas(ids, luz, x0, y0, nombre, paso=1.7, muestra=1.3):
    rnd = random.Random(7)
    H, W = ids.shape
    out = []
    for capa, (ang, umbral) in enumerate(capas_de(nombre)):
        d = np.array([math.cos(ang), math.sin(ang)]); n = np.array([-d[1], d[0]])
        cx, cy = W / ESC / 2, H / ESC / 2; R = math.hypot(cx, cy)
        lote = []
        o = -R
        while o <= R:
            oj = o + (rnd.random() - 0.5) * paso * 0.35
            run, pid = [], None
            t = -R
            def cerrar():
                nonlocal run
                # el tramo se parte en trazos cortos (4–9 unidades) con un respiro entre ellos, como a plumilla
                i = 0
                while i < len(run) - 2:
                    n_ = rnd.randint(3, 7); seg = run[i:i + n_]
                    if len(seg) > 2:
                        j = (rnd.random() - 0.5) * 0.5
                        lote.append("M" + "L".join(f"{x0 + p[0]:.1f} {y0 + p[1] + j:.1f}" for p in seg))
                    i += n_ + (1 if rnd.random() < 0.7 else 2)
                run = []
            while t <= R:
                u = t / R; b = 0.35 * (1 - u * u) * R * 0.25
                x = cx + n[0] * (oj + b) + d[0] * t; y = cy + n[1] * (oj + b) + d[1] * t
                px, py = int(x * ESC), int(y * ESC)
                ok = 0 <= px < W and 0 <= py < H and ids[py, px] > 0 and luz[py, px] > umbral + (rnd.random() - 0.5) * 0.06
                if ok and pid is not None and ids[py, px] != pid: cerrar()  # la trama se corta al cambiar de pieza: cada volumen con la suya
                if ok: run.append((x, y)); pid = ids[py, px]
                else: cerrar(); pid = None
                t += muestra
            cerrar()
            if len(lote) >= 9: out.append((capa, "".join(lote))); lote = []
            o += paso * (1.15 if capa else 1)
        if lote: out.append((capa, "".join(lote)))
    return out

async def main():
    datos = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        pg = await b.new_page()
        await pg.goto("http://localhost:8765/tools-ref/modelos.html"); await pg.wait_for_function("window.listo")
        for nombre, (x0, y0, w, h) in LAMINAS.items():
            W, H = w * ESC, h * ESC
            r = await pg.evaluate(f"render('{nombre}', {W}, {H})")
            ids = np.frombuffer(base64.b64decode(r["ids"]), np.uint8).reshape(H, W, 4)[::-1, :, 0].copy()
            nor = np.frombuffer(base64.b64decode(r["normales"]), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(float) / 127.5 - 1
            # luz: lambert con la luz arriba a la izquierda, un poco de luz ambiente y un rebote frío desde abajo
            lam = np.clip(nor @ L, 0, 1) * 0.92 + 0.06
            lam[ids == 0] = 0
            from PIL import Image
            Image.fromarray((lam*255).astype(np.uint8)).save(f'/tmp/ref_{nombre}.png')
            partes = []
            for pid in sorted(set(np.unique(ids)) - {0}):
                m = morphology.opening(ids == pid, morphology.disk(1))
                for c in measure.find_contours(np.pad(m, 1).astype(float), 0.5):
                    if len(c) < 24: continue
                    c = measure.approximate_polygon(c, tolerance=1.6) - 1
                    pts = [[round(x0 + q[1] / ESC, 1), round(y0 + q[0] / ESC, 1)] for q in c]
                    if len(pts) >= 4: partes.append({"id": int(pid), "p": pts})
            silueta = []
            for c in measure.find_contours(np.pad(morphology.opening(ids > 0, morphology.disk(1)), 1).astype(float), 0.5):
                if len(c) < 24: continue
                c = measure.approximate_polygon(c, tolerance=1.4) - 1
                silueta.append([[round(x0 + q[1] / ESC, 1), round(y0 + q[0] / ESC, 1)] for q in c])
            tr = tramas(ids, lam, x0, y0, nombre)
            anclas = {k: [round(x0 + v[0] / ESC, 1), round(y0 + v[1] / ESC, 1)] for k, v in r["anclas"].items()}
            ys, xs = np.nonzero(ids)
            bx0, bx1, by0, by1 = x0 + xs.min() / ESC, x0 + xs.max() / ESC, y0 + ys.min() / ESC, y0 + ys.max() / ESC
            vb = [round(bx0 - 3, 1), round(by0 - 3, 1), round(bx1 - bx0 + 6, 1), round(by1 - by0 + 3 + (14 if nombre != "murcielago" else 3), 1)]
            datos[nombre] = {"vb": vb, "suelo": round(by1, 1), "silueta": silueta, "partes": partes, "tramas": tr, "anclas": anclas}
            print(nombre, len(partes), "contornos,", sum(len(t[1]) for t in tr) // 1024, "KB de trama")
        await b.close()
    js = "// Generado por tools/ref/calcar.py a partir de los maniquíes low poly de tools-ref/modelos.html:\n// contornos visibles de cada pieza (con lo que tapa a qué) y la trama que dibuja la luz sobre los volúmenes.\n// Es la referencia «calcada»; la mano (pelo, garras, ojos, rótulos) se añade encima en bocetos.js.\nexport const REF = " + json.dumps(datos, separators=(",", ":")) + ";\n"
    open("/home/claude/sc4/js/bocetos-ref.js", "w").write(js)
    print(len(js) // 1024, "KB")

asyncio.run(main())
