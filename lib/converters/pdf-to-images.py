#!/usr/bin/env python3
"""
PDF 페이지를 PNG로 변환 (PyMuPDF 사용)
Usage: python pdf-to-images.py <pdf_path> <out_dir> <dpi> <page1> [page2 ...]
각 페이지를 <out_dir>/page-<n>.png 로 저장 후 경로를 stdout에 출력
"""
import sys
import os
import fitz  # PyMuPDF

def main():
    if len(sys.argv) < 5:
        print("Usage: pdf-to-images.py <pdf_path> <out_dir> <dpi> <pages...>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    out_dir = sys.argv[2]
    dpi = int(sys.argv[3])
    pages = [int(p) for p in sys.argv[4:]]

    os.makedirs(out_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    scale = dpi / 72
    mat = fitz.Matrix(scale, scale)

    for page_num in pages:
        try:
            page = doc[page_num - 1]  # 0-indexed
            pix = page.get_pixmap(matrix=mat, alpha=False)
            out_path = os.path.join(out_dir, f"page-{page_num}.jpg")
            pix.save(out_path, jpg_quality=88)
            print(f"OK|{page_num}|{out_path}", flush=True)
        except Exception as e:
            print(f"ERR|{page_num}|{e}", flush=True)

    doc.close()

if __name__ == "__main__":
    main()
