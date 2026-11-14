#!/usr/bin/env python3
"""Local-only inspection server. No proxying, account data or API emulation."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,unquote
import json
ROOT=Path(__file__).resolve().parents[1]
ION=ROOT/'reference/ion-dist'
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  route=unquote(urlsplit(self.path).path)
  if route.startswith(('/api/','/v1/')):
   self.send_response(503);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"error":"offline_ui_inspection_no_backend"}');return
  super().do_GET()
 def translate_path(self,p):
  route=unquote(urlsplit(p).path)
  if route in ('/original','/original/','/code','/new','/login'):return str(ION/'index.html')
  if route.startswith(('/assets/','/_frame-rt/','/i18n/','/images/','/audio/')):
   target=(ION/route.lstrip('/')).resolve()
   return str(target if target.is_relative_to(ION.resolve()) else ROOT/'missing')
  target=(ROOT/route.lstrip('/')).resolve()
  return str(target if target.is_relative_to(ROOT) else ROOT/'missing')
 def end_headers(self):
  self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' blob:; form-action 'none'; object-src 'none'; base-uri 'self'")
  self.send_header('Cache-Control','no-store')
  super().end_headers()
if __name__=='__main__':
 print('UI inspection: http://127.0.0.1:4318/original/',flush=True)
 ThreadingHTTPServer(('127.0.0.1',4318),Handler).serve_forever()
