import icon3ds from '../../design-references/icons/3ds-svgrepo-com.svg';
import iconAac from '../../design-references/icons/aac-svgrepo-com.svg';
import iconAi from '../../design-references/icons/ai-ai-svgrepo-com.svg';
import iconAndroid from '../../design-references/icons/android-svgrepo-com.svg';
import iconAvi from '../../design-references/icons/avi-svgrepo-com.svg';
import iconBmp from '../../design-references/icons/bmp-svgrepo-com.svg';
import iconCad from '../../design-references/icons/cad-svgrepo-com.svg';
import iconCdr from '../../design-references/icons/cdr-svgrepo-com.svg';
import iconCpp from '../../design-references/icons/cpp-svgrepo-com.svg';
import iconCss from '../../design-references/icons/css-svgrepo-com.svg';
import iconDat from '../../design-references/icons/dat-svgrepo-com.svg';
import iconDll from '../../design-references/icons/dll-svgrepo-com.svg';
import iconDmg from '../../design-references/icons/dmg-svgrepo-com.svg';
import iconDoc from '../../design-references/icons/doc-svgrepo-com.svg';
import iconDocker from '../../design-references/icons/docker-svgrepo-com.svg';
import iconEps from '../../design-references/icons/eps-svgrepo-com.svg';
import iconFla from '../../design-references/icons/fla-svgrepo-com.svg';
import iconFlv from '../../design-references/icons/flv-svgrepo-com.svg';
import iconGif from '../../design-references/icons/gif-svgrepo-com.svg';
import iconGit from '../../design-references/icons/git-svgrepo-com.svg';
import iconGithub from '../../design-references/icons/github-svgrepo-com.svg';
import iconHtml from '../../design-references/icons/html-svgrepo-com.svg';
import iconIndd from '../../design-references/icons/indd-svgrepo-com.svg';
import iconIso from '../../design-references/icons/iso-svgrepo-com.svg';
import iconJava from '../../design-references/icons/java-4-logo-svgrepo-com.svg';
import iconJs from '../../design-references/icons/js-svgrepo-com.svg';
import iconKotlin from '../../design-references/icons/kotlin-svgrepo-com.svg';
import iconMpg from '../../design-references/icons/mpg-svgrepo-com.svg';
import iconPng from '../../design-references/icons/png-svgrepo-com.svg';
import iconPython from '../../design-references/icons/python-svgrepo-com.svg';
import iconReact from '../../design-references/icons/react-svgrepo-com.svg';
import iconSvg from '../../design-references/icons/svg-svgrepo-com.svg';
import iconTxt from '../../design-references/icons/txt-svgrepo-com.svg';
import iconVue from '../../design-references/icons/vue-svgrepo-com.svg';

/** Расширение → SVG из design-references/icons */
const EXT_ICON = {
  // Android
  apk: iconAndroid,
  aab: iconAndroid,
  // Python
  py: iconPython,
  pyw: iconPython,
  pyi: iconPython,
  // JavaScript / TypeScript (ближайшая — JS)
  js: iconJs,
  mjs: iconJs,
  cjs: iconJs,
  ts: iconJs,
  // React
  jsx: iconReact,
  tsx: iconReact,
  // Vue
  vue: iconVue,
  // Java / Kotlin
  java: iconJava,
  jar: iconJava,
  class: iconJava,
  kt: iconKotlin,
  kts: iconKotlin,
  // Web
  html: iconHtml,
  htm: iconHtml,
  css: iconCss,
  scss: iconCss,
  sass: iconCss,
  less: iconCss,
  // C / C++
  c: iconCpp,
  h: iconCpp,
  cpp: iconCpp,
  cc: iconCpp,
  cxx: iconCpp,
  hpp: iconCpp,
  hxx: iconCpp,
  // Text / docs
  txt: iconTxt,
  log: iconTxt,
  md: iconTxt,
  markdown: iconTxt,
  rtf: iconTxt,
  csv: iconTxt,
  doc: iconDoc,
  docx: iconDoc,
  odt: iconDoc,
  // Images
  png: iconPng,
  jpg: iconPng,
  jpeg: iconPng,
  webp: iconPng,
  ico: iconPng,
  gif: iconGif,
  bmp: iconBmp,
  svg: iconSvg,
  // Video
  avi: iconAvi,
  flv: iconFlv,
  mpg: iconMpg,
  mpeg: iconMpg,
  mp4: iconMpg,
  mov: iconMpg,
  mkv: iconMpg,
  webm: iconMpg,
  // Audio
  aac: iconAac,
  mp3: iconAac,
  wav: iconAac,
  flac: iconAac,
  ogg: iconAac,
  m4a: iconAac,
  // Disk / binary
  iso: iconIso,
  dmg: iconDmg,
  dll: iconDll,
  so: iconDll,
  sys: iconDll,
  dat: iconDat,
  bin: iconDat,
  // Design / 3D
  ai: iconAi,
  eps: iconEps,
  cdr: iconCdr,
  indd: iconIndd,
  cad: iconCad,
  dwg: iconCad,
  dxf: iconCad,
  '3ds': icon3ds,
  fla: iconFla,
  // Docker / Git
  dockerfile: iconDocker,
  dockerignore: iconDocker,
  gitignore: iconGit,
  gitattributes: iconGit,
  gitmodules: iconGit,
};

const NAME_ICON = {
  dockerfile: iconDocker,
  'docker-compose.yml': iconDocker,
  'docker-compose.yaml': iconDocker,
  '.dockerignore': iconDocker,
  '.gitignore': iconGit,
  '.gitattributes': iconGit,
  '.gitmodules': iconGit,
};

function DefaultFileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function resolveFileIconSrc(fileName = '', mimeType = '', language = '') {
  const name = String(fileName || '').trim().toLowerCase();
  const mime = String(mimeType || '').toLowerCase();
  const lang = String(language || '').toLowerCase();

  if (lang === 'python' || mime.includes('python')) return iconPython;
  if (lang === 'javascript' || lang === 'js' || mime.includes('javascript')) return iconJs;
  if (lang === 'java') return iconJava;
  if (lang === 'kotlin') return iconKotlin;
  if (lang === 'html') return iconHtml;
  if (lang === 'css') return iconCss;
  if (lang === 'cpp' || lang === 'c++' || lang === 'c') return iconCpp;

  if (name && NAME_ICON[name]) return NAME_ICON[name];

  // «Dockerfile» без расширения
  if (name === 'dockerfile' || name.startsWith('dockerfile.')) return iconDocker;

  const dot = name.lastIndexOf('.');
  if (dot >= 0 && dot < name.length - 1) {
    const ext = name.slice(dot + 1);
    if (EXT_ICON[ext]) return EXT_ICON[ext];
  }

  if (mime.startsWith('image/png') || mime === 'image/jpeg' || mime === 'image/webp') return iconPng;
  if (mime === 'image/gif') return iconGif;
  if (mime === 'image/bmp') return iconBmp;
  if (mime === 'image/svg+xml') return iconSvg;
  if (mime.startsWith('video/')) return iconMpg;
  if (mime.startsWith('audio/')) return iconAac;
  if (mime.includes('android') || mime.includes('apk')) return iconAndroid;
  if (mime.includes('msword') || mime.includes('wordprocessing')) return iconDoc;
  if (mime.startsWith('text/')) return iconTxt;

  return null;
}

/**
 * Иконка типа файла по имени / mime / языку кода.
 * @param {'sm'|'md'|'lg'} [size]
 */
export function FileTypeIcon({
  fileName = '',
  mimeType = '',
  language = '',
  className = '',
  size = 'md',
  alt = '',
}) {
  const src = resolveFileIconSrc(fileName, mimeType, language);
  const classes = ['file-type-icon', `file-type-icon--${size}`, className].filter(Boolean).join(' ');

  if (!src) {
    return (
      <span className={`${classes} file-type-icon--fallback`} aria-hidden="true">
        <DefaultFileIcon />
      </span>
    );
  }

  return (
    <img
      className={classes}
      src={src}
      alt={alt}
      draggable={false}
      loading="lazy"
    />
  );
}

// Экспорт для редких прямых нужд (превью и т.п.)
export const FILE_ICON_BY_EXT = EXT_ICON;
export { iconPython, iconJs, iconAndroid, iconGithub };
