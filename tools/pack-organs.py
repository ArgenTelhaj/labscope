import sys, os
from PIL import Image, ImageFilter

def pack(src, dst):
    im = Image.open(src).convert('RGB')
    if im.size != (1024, 1024):
        im = im.resize((1024, 1024), Image.LANCZOS)
    # The renders carry fine film grain that survives palette reduction and
    # doubles the file size; a radius-3 median drops it without touching the
    # painterly forms, which are never displayed above 320 CSS px anyway.
    im = im.filter(ImageFilter.MedianFilter(3))
    im.convert('P', palette=Image.ADAPTIVE, colors=128).save(dst, optimize=True)
    print(f'{os.path.basename(dst):18} {os.path.getsize(dst)//1024}KB')

for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    pack(src, dst)
