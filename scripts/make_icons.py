# Regenerate with: python3 scripts/make_icons.py public   (needs Pillow)
# Draws the ClipEngine app icon: a Win95-style window on desktop teal with a green play button.
import sys
from PIL import Image, ImageDraw
out = sys.argv[1]
S = 2048  # draw large, scale down for smooth edges
img = Image.new('RGB', (S, S), '#008080')
d = ImageDraw.Draw(img)
u = S / 512
def r(x0, y0, x1, y1, fill): d.rectangle([x0*u, y0*u, x1*u, y1*u], fill=fill)
# window inside the maskable safe zone (centre 80%)
x0, y0, x1, y1 = 96, 116, 416, 396
r(x0+10, y0+10, x1+10, y1+10, '#004d4d')          # shadow
r(x0, y0, x1, y1, '#c0c0c0')                       # body
r(x0, y0, x1, y0+3, '#ffffff'); r(x0, y0, x0+3, y1, '#ffffff')   # bevel light
r(x0, y1-3, x1, y1, '#404040'); r(x1-3, y0, x1, y1, '#404040')   # bevel dark
r(x0+8, y0+8, x1-8, y0+48, '#000080')              # title bar
r(x1-44, y0+14, x1-16, y0+42, '#c0c0c0')           # close button
r(x0+22, y0+64, x1-22, y1-20, '#000000')           # screen
cx, cy, h = 256, 270, 62
d.polygon([((cx-h*0.8)*u, (cy-h)*u), ((cx-h*0.8)*u, (cy+h)*u), ((cx+h)*u, cy*u)], fill='#00ff00')
for size in (192, 512):
    img.resize((size, size), Image.LANCZOS).save(f'{out}/icon-{size}.png', optimize=True)
