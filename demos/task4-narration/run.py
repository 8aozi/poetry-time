#!/usr/bin/env python3
"""Reproduce and serve the archived Task 4 audition on localhost (Python stdlib only)."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import wave

ROOT = Path(__file__).resolve().parent
LINES = ('床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。')
FILES = [f'line-{i}.wav' for i in range(1, 5)] + ['poem.wav']


def generate_audio(force=False):
    if not force and all((ROOT / name).is_file() for name in FILES):
        return
    say = shutil.which('say') if sys.platform == 'darwin' else None
    if not say:
        raise RuntimeError('首次生成试听需要 macOS 内置 say 和婷婷（Tingting）语音。请在 Mac 上运行；已有本地 WAV 时可在其他系统播放。')
    # Generate the complete set before replacing any existing sample.
    with tempfile.TemporaryDirectory(prefix='poetry-task4-') as directory:
        temp = Path(directory)
        for i, text in enumerate(LINES, 1):
            result = subprocess.run(
                [say, '-v', 'Tingting', '-r', '155', '-o', str(temp / f'line-{i}.wav'),
                 '--data-format=LEI16@22050', text],
                capture_output=True, text=True, timeout=30)
            if result.returncode:
                raise RuntimeError('语音生成失败，请检查系统是否安装“婷婷”中文语音。' + result.stderr.strip())
        with wave.open(str(temp / FILES[0]), 'rb') as source:
            params = source.getparams()
        with wave.open(str(temp / 'poem.wav'), 'wb') as output:
            output.setparams(params)
            for i in range(1, 5):
                with wave.open(str(temp / f'line-{i}.wav'), 'rb') as source:
                    if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (params.nchannels, params.sampwidth, params.framerate):
                        raise RuntimeError('语音文件格式不一致，无法拼接。')
                    output.writeframes(source.readframes(source.getnframes()))
                if i < 4:
                    output.writeframes(b'\0' * int(params.framerate * .35) * params.nchannels * params.sampwidth)
        for name in FILES:
            shutil.copyfile(temp / name, ROOT / name)
    print('本地试听音频已生成（婷婷，155 words/min；句间增加 350 ms 停顿）。', flush=True)


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4175, help='Local port (default: 4175)')
    parser.add_argument('--regenerate', action='store_true', help='Regenerate all local audio')
    parser.add_argument('--generate-only', action='store_true', help='Generate audio without starting server')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('端口应介于 1 与 65535 之间。')
    generate_audio(args.regenerate)
    if args.generate_only:
        return
    with ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT))) as server:
        print(f'Task 4 独立试听：http://127.0.0.1:{args.port}/\n人工 Review：效果不理想，不集成到正式项目。\n按 Ctrl+C 停止。', flush=True)
        server.serve_forever()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n试听服务已停止。')
    except (RuntimeError, OSError, subprocess.TimeoutExpired, wave.Error) as error:
        print(f'无法启动：{error}', file=sys.stderr)
        sys.exit(1)
