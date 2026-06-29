const fs = require('node:fs');
const path = require('node:path');
const ResEdit = require('resedit');

const electronRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(electronRoot, 'package.json'), 'utf-8'));
const exePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(electronRoot, 'dist-package', 'win-unpacked', '奥德赛0.0.exe');

if (!fs.existsSync(exePath)) {
  throw new Error(`exe not found: ${exePath}`);
}

const version = normalizeVersion(packageJson.version || '0.0.0');
const productName = '奥德赛0.0';
const description = '奥德赛0.0 Runtime Workbench';

const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath));
const res = ResEdit.NtExecutableResource.from(exe);
const versions = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
const vi = versions[0] || ResEdit.Resource.VersionInfo.createEmpty();
const language = { lang: 1033, codepage: 1200 };

vi.setFileVersion(version, language.lang);
vi.setProductVersion(version, language.lang);
vi.setStringValues(language, {
  CompanyName: 'howtion',
  FileDescription: description,
  FileVersion: version,
  InternalName: '奥德赛0.0.exe',
  OriginalFilename: '奥德赛0.0.exe',
  ProductName: productName,
  ProductVersion: version,
  LegalCopyright: 'Copyright (C) howtion. All rights reserved.',
}, true);
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));

console.log(JSON.stringify({ exePath, productName, version }, null, 2));

function normalizeVersion(value) {
  const parts = String(value)
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 4).join('.');
}
