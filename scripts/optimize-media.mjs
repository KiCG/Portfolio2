// 画像・動画を Web 配信用に軽量化するスクリプト
//
//   npm run optimize-media
//
// src/assets 以下の元ファイル（png / jpg / mp4）はそのまま残し、
// 変換結果を src/assets/optimized/ に同じフォルダ構成で書き出す。
//   画像: WebP（幅 800 / 1280 / 1920px の 3 サイズ。元画像より大きくはしない）
//   動画: H.264 720p・音声なし・faststart の mp4 と、ポスター画像（WebP）
// すでに変換済みで元ファイルより新しいものはスキップする（--force で全部やり直し）。
// 動画の変換には ffmpeg が必要。

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import sharp from 'sharp';

const SRC_DIR = 'src/assets';
const OUT_DIR = 'src/assets/optimized';
const SKIP_DIRS = new Set(['optimized', 'loading']);
const IMAGE_WIDTHS = [800, 1280, 1920];
const WEBP_QUALITY = 78;
const VIDEO_HEIGHT = 720;
const VIDEO_CRF = 26;
const FORCE = process.argv.includes('--force');

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(name)) files.push(...walk(p));
    } else {
      files.push(p);
    }
  }
  return files;
}

const isFresh = (out, src) => !FORCE && existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;
const outBase = (src) => {
  const rel = relative(SRC_DIR, src);
  return join(OUT_DIR, rel.slice(0, -extname(rel).length));
};
const mb = (bytes) => (bytes / 1e6).toFixed(2) + 'MB';

async function optimizeImage(src) {
  const base = outBase(src);
  mkdirSync(dirname(base), { recursive: true });
  const { width = 0 } = await sharp(src).metadata();
  const widths = IMAGE_WIDTHS.filter((w) => w < width);
  if (widths.length < IMAGE_WIDTHS.length) widths.push(Math.min(width, IMAGE_WIDTHS.at(-1)));
  for (const w of new Set(widths)) {
    const out = `${base}-${w}.webp`;
    if (isFresh(out, src)) continue;
    await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(out);
    console.log(`image ${src} (${mb(statSync(src).size)}) -> ${out} (${mb(statSync(out).size)})`);
  }
}

async function optimizeVideo(src) {
  const base = outBase(src);
  mkdirSync(dirname(base), { recursive: true });
  const out = `${base}.mp4`;
  const poster = `${base}-poster.webp`;
  if (!isFresh(out, src)) {
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-i', src,
      '-vf', `scale=-2:'min(${VIDEO_HEIGHT},ih)'`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(VIDEO_CRF),
      '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-an', '-movflags', '+faststart', out,
    ]);
    console.log(`video ${src} (${mb(statSync(src).size)}) -> ${out} (${mb(statSync(out).size)})`);
  }
  if (!isFresh(poster, src)) {
    const png = execFileSync('ffmpeg', [
      '-v', 'error', '-i', src, '-frames:v', '1',
      '-vf', `scale=-2:'min(${VIDEO_HEIGHT},ih)'`, '-f', 'image2pipe', '-c:v', 'png', '-',
    ], { maxBuffer: 64 * 1024 * 1024 });
    await sharp(png).webp({ quality: 70 }).toFile(poster);
  }
}

for (const src of walk(SRC_DIR)) {
  const ext = extname(src).toLowerCase();
  if (['.png', '.jpg', '.jpeg'].includes(ext)) await optimizeImage(src);
  else if (ext === '.mp4') await optimizeVideo(src);
}
