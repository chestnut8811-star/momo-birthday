#!/usr/bin/env python3
"""開発用サーバー。キャッシュさせないので、ES モジュールの新旧が混ざらない。
使い方: python3 tools/serve.py [ポート=8765] [公開フォルダ=app]
"""
import functools
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.webmanifest': 'application/manifest+json',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    # 既定の待ち行列（5）だと、ES モジュールを一斉に読むときに接続が切られることがある
    request_queue_size = 128
    daemon_threads = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    root = sys.argv[2] if len(sys.argv) > 2 else 'app'
    handler = functools.partial(NoCacheHandler, directory=root)
    with Server(('127.0.0.1', port), handler) as httpd:
        print(f'http://localhost:{port}/ で {root} を配信中（Ctrl+C で終了）', flush=True)
        httpd.serve_forever()


if __name__ == '__main__':
    main()
