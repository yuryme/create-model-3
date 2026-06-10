#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RESERVED_NAMES = new Set([
  'group', 'order', 'user', 'select', 'from', 'where', 'table', 'index',
  'key', 'value', 'count', 'sum', 'case', 'when', 'default',
]);

const NAME_RE = /^[a-z][a-z0-9_]*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function usage() {
  return `Usage: node tools/metadata-validator/validate-metadata.mjs [metadataRoot] [--json] [--self-test]

Validates BaSYS metadata without LLM decisions.

Arguments:
  metadataRoot   Path to metadata directory. Defaults to ./metadata.
  --json         Print machine-readable JSON report.
  --self-test    Run validator against temporary negative fixtures.
`;
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(full));
    else result.push(full);
  }
  return result;
}

function normalizeRel(file, root) {
  return path.relative(root, file).split(path.sep).join('/');
}

function addIssue(issues, severity, code, file, location, message) {
  issues.push({ severity, code, file, location, message });
}

function parseJson(file, root, issues) {
  const rel = normalizeRel(file, root);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    addIssue(issues, 'error', 'JSON_PARSE', rel, '$', error.message);
    return undefined;
  }
}

function isManifest(rel) {
  return rel === 'manifest.json';
}

function isSystem(rel) {
  return rel === 'system/dataTypes.json' || rel.startsWith('system/');
}

function isUserJson(rel) {
  return rel.endsWith('.json') && !isManifest(rel) && !isSystem(rel);
}

function getTopLevelObjectInfo(rel) {
  const parts = rel.split('/');
  if (parts.length !== 3) return null;
  const [kind, objectName, fileName] = parts;
  if (fileName !== `${kind}.${objectName}.json`) return null;
  return { kind, objectName };
}

function collectKindData(root, parsedByRel, issues) {
  const kindByUid = new Map();
  const kindByName = new Map();
  const kindsDir = path.join(root, 'system', 'kinds');

  for (const file of walkFiles(kindsDir).filter((item) => item.endsWith('.json'))) {
    const rel = normalizeRel(file, root);
    const data = parsedByRel.get(rel);
    if (!data) continue;
    if (typeof data.uid !== 'string' || !data.uid) {
      addIssue(issues, 'error', 'KIND_UID_MISSING', rel, '$.uid', 'Kind has no uid.');
      continue;
    }
    kindByUid.set(data.uid, data);
    if (typeof data.name === 'string' && data.name) kindByName.set(data.name, data);
  }

  return { kindByUid, kindByName };
}

function collectDataTypes(root, parsedByRel, issues) {
  const rel = 'system/dataTypes.json';
  const data = parsedByRel.get(rel);
  const byUid = new Map();
  const byKindName = new Map();

  if (!Array.isArray(data)) {
    addIssue(issues, 'error', 'DATATYPES_INVALID', rel, '$', 'system/dataTypes.json must be an array.');
    return { byUid, byKindName };
  }

  data.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    if (typeof entry.uid === 'string') byUid.set(entry.uid, entry);
    if (entry.kind && entry.name) byKindName.set(`${entry.kind}/${entry.name}`, entry);
    if (entry.objectKindUid && typeof entry.objectKindUid === 'string') {
      // objectKindUid is checked later against kind UIDs once kinds are loaded.
    }
    if (entry.uid && !UUID_RE.test(entry.uid)) {
      addIssue(issues, 'error', 'DATATYPE_UID_FORMAT', rel, `$[${index}].uid`, `Invalid UUID: ${entry.uid}`);
    }
  });

  return { byUid, byKindName };
}

function checkSchemaPath(root, rel, data, issues) {
  if (!isUserJson(rel)) return;
  if (!Object.prototype.hasOwnProperty.call(data, '$schema')) {
    addIssue(issues, 'error', 'SCHEMA_MISSING', rel, '$schema', 'User metadata JSON must declare $schema.');
    return;
  }
  if (typeof data.$schema !== 'string' || !data.$schema) {
    addIssue(issues, 'error', 'SCHEMA_INVALID', rel, '$schema', '$schema must be a non-empty relative path.');
    return;
  }
  if (path.isAbsolute(data.$schema)) {
    addIssue(issues, 'error', 'SCHEMA_ABSOLUTE', rel, '$schema', '$schema must be relative to the JSON file.');
    return;
  }
  const schemaFile = path.normalize(path.join(root, path.dirname(rel), data.$schema));
  if (!fs.existsSync(schemaFile)) {
    addIssue(issues, 'error', 'SCHEMA_NOT_FOUND', rel, '$schema', `Schema file does not exist: ${data.$schema}`);
  }
}

function checkName(value, rel, location, issues, maxLength = 30) {
  if (typeof value !== 'string' || !value) return;
  if (!NAME_RE.test(value)) {
    addIssue(issues, 'error', 'NAME_PATTERN', rel, location, `Name must match ${NAME_RE}: ${value}`);
  }
  if (value.length > maxLength) {
    addIssue(issues, 'error', 'NAME_LENGTH', rel, location, `Name length must be <= ${maxLength}: ${value}`);
  }
  if (RESERVED_NAMES.has(value)) {
    addIssue(issues, 'error', 'NAME_RESERVED', rel, location, `Name is SQL-reserved by project policy: ${value}`);
  }
}

function traverse(value, visit, pathParts = ['$']) {
  if (!value || typeof value !== 'object') return;
  visit(value, pathParts.join('.'));
  if (Array.isArray(value)) {
    value.forEach((item, index) => traverse(item, visit, [...pathParts, `[${index}]`]));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    traverse(child, visit, [...pathParts, key]);
  }
}

function checkNames(rel, data, issues) {
  if (!isUserJson(rel)) return;
  traverse(data, (node, location) => {
    if (Object.prototype.hasOwnProperty.call(node, 'name')) {
      checkName(node.name, rel, `${location}.name`, issues);
    }
  });
}

function collectGeneratedUids(rel, data, issues, seenGeneratedUids) {
  if (!isUserJson(rel)) return;
  traverse(data, (node, location) => {
    if (typeof node.uid !== 'string') return;
    if (!UUID_RE.test(node.uid)) {
      addIssue(issues, 'error', 'UID_FORMAT', rel, `${location}.uid`, `Invalid UUID: ${node.uid}`);
      return;
    }
    const previous = seenGeneratedUids.get(node.uid);
    if (previous) {
      addIssue(issues, 'error', 'UID_DUPLICATE_GENERATED', rel, `${location}.uid`, `Generated uid duplicates ${previous.file} ${previous.location}: ${node.uid}`);
    } else {
      seenGeneratedUids.set(node.uid, { file: rel, location: `${location}.uid` });
    }
  });
}

function checkTopLevelObject(root, rel, data, kindData, dataTypes, objectUids, objectNames, issues) {
  const info = getTopLevelObjectInfo(rel);
  if (!info) return;

  if (data.name !== info.objectName) {
    addIssue(issues, 'error', 'OBJECT_NAME_PATH_MISMATCH', rel, '$.name', `Expected ${info.objectName}, got ${data.name}`);
  }

  const kind = kindData.kindByName.get(info.kind);
  if (!kind) {
    addIssue(issues, 'error', 'KIND_FOLDER_UNKNOWN', rel, '$', `Unknown kind folder: ${info.kind}`);
  } else if (Object.prototype.hasOwnProperty.call(data, 'metaObjectKindUid') && data.metaObjectKindUid !== kind.uid) {
    addIssue(issues, 'error', 'KIND_UID_MISMATCH', rel, '$.metaObjectKindUid', `Expected kind uid ${kind.uid} for ${info.kind}, got ${data.metaObjectKindUid}`);
  } else if (kind.storeData === true && !Object.prototype.hasOwnProperty.call(data, 'metaObjectKindUid')) {
    addIssue(issues, 'error', 'KIND_UID_MISSING', rel, '$.metaObjectKindUid', `Storable kind ${info.kind} must declare metaObjectKindUid.`);
  }

  if (typeof data.uid !== 'string' || !UUID_RE.test(data.uid)) {
    addIssue(issues, 'error', 'OBJECT_UID_INVALID', rel, '$.uid', `Invalid object uid: ${data.uid}`);
  } else {
    const previous = objectUids.get(data.uid);
    if (previous) addIssue(issues, 'error', 'OBJECT_UID_DUPLICATE', rel, '$.uid', `Duplicates ${previous}: ${data.uid}`);
    else objectUids.set(data.uid, rel);
  }

  const nameKey = `${info.kind}/${data.name}`;
  const previousName = objectNames.get(nameKey);
  if (previousName) addIssue(issues, 'error', 'OBJECT_NAME_DUPLICATE', rel, '$.name', `Duplicates ${previousName}: ${nameKey}`);
  else objectNames.set(nameKey, rel);

  if (kind && kind.isReference === true) {
    const registered = dataTypes.byKindName.get(nameKey);
    if (!registered) {
      addIssue(issues, 'error', 'DATATYPE_REGISTRATION_MISSING', rel, '$.uid', `Reference-kind object must be registered in system/dataTypes.json: ${nameKey}`);
    } else {
      if (registered.uid !== data.uid) {
        addIssue(issues, 'error', 'DATATYPE_REGISTRATION_UID_MISMATCH', rel, '$.uid', `dataTypes uid ${registered.uid} does not match object uid ${data.uid}`);
      }
      if (kind && registered.objectKindUid !== kind.uid) {
        addIssue(issues, 'error', 'DATATYPE_REGISTRATION_KIND_MISMATCH', rel, '$.metaObjectKindUid', `dataTypes objectKindUid ${registered.objectKindUid} does not match kind uid ${kind.uid}`);
      }
    }
  }
}

function checkDataTypeUids(rel, data, dataTypes, issues) {
  if (!isUserJson(rel)) return;
  traverse(data, (node, location) => {
    const uid = node?.dataSettings?.dataTypeUid;
    if (typeof uid !== 'string') return;
    if (!dataTypes.byUid.has(uid)) {
      addIssue(issues, 'error', 'DATA_TYPE_UID_UNKNOWN', rel, `${location}.dataSettings.dataTypeUid`, `Unknown dataTypeUid: ${uid}`);
    }
  });
}

function checkStandardColumns(rel, data, kindData, issues) {
  const info = getTopLevelObjectInfo(rel);
  if (!info) return;
  const kind = kindData.kindByUid.get(data.metaObjectKindUid);
  if (!kind || kind.storeData !== true) return;

  const columns = data?.header?.columns;
  if (!Array.isArray(columns)) {
    addIssue(issues, 'error', 'HEADER_COLUMNS_MISSING', rel, '$.header.columns', 'Storable object must have header.columns.');
    return;
  }

  const standardColumns = Array.isArray(kind.standardColumns) ? kind.standardColumns : [];
  standardColumns.forEach((standard, index) => {
    const column = columns[index];
    if (!column) {
      addIssue(issues, 'error', 'STANDARD_COLUMN_MISSING', rel, `$.header.columns[${index}]`, `Missing standard column ${standard.name}.`);
      return;
    }
    if (column.name !== standard.name) {
      addIssue(issues, 'error', 'STANDARD_COLUMN_NAME', rel, `$.header.columns[${index}].name`, `Expected ${standard.name}, got ${column.name}.`);
    }
    if (column.standardColumnUid !== standard.uid) {
      addIssue(issues, 'error', 'STANDARD_COLUMN_UID', rel, `$.header.columns[${index}].standardColumnUid`, `Expected ${standard.uid}, got ${column.standardColumnUid}.`);
    }
    if (column.isStandard !== true) {
      addIssue(issues, 'error', 'STANDARD_COLUMN_FLAG', rel, `$.header.columns[${index}].isStandard`, `Expected true, got ${column.isStandard}.`);
    }
  });

  const standardNames = new Set(standardColumns.map((column) => column.name));
  columns.slice(standardColumns.length).forEach((column, offset) => {
    if (standardNames.has(column.name)) {
      addIssue(issues, 'error', 'CUSTOM_COLUMN_COLLIDES_STANDARD', rel, `$.header.columns[${standardColumns.length + offset}].name`, `Custom column collides with standard column: ${column.name}`);
    }
  });
}

function checkDetailServiceColumns(rel, data, kindData, issues) {
  const info = getTopLevelObjectInfo(rel);
  if (!info) return;
  const kind = kindData.kindByUid.get(data.metaObjectKindUid);
  if (!kind || kind.useDetailsTables !== true) return;

  if (!Array.isArray(data.detailTables)) return;
  data.detailTables.forEach((table, tableIndex) => {
    const columns = Array.isArray(table.columns) ? table.columns : [];
    const actual = columns.slice(0, 3).map((column) => column.name).join(',');
    if (actual !== 'id,object_uid,row_number') {
      addIssue(issues, 'error', 'DETAIL_SERVICE_COLUMN_ORDER', rel, `$.detailTables[${tableIndex}].columns[0..2]`, `Expected id,object_uid,row_number, got ${actual || '<empty>'}.`);
    }
  });
}

function validate(metadataRoot) {
  const root = path.resolve(metadataRoot);
  const issues = [];
  const stats = {
    root,
    jsonFiles: 0,
    userJsonFiles: 0,
    topLevelObjects: 0,
    generatedUids: 0,
  };

  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    addIssue(issues, 'error', 'METADATA_ROOT_MISSING', '.', '$', `Metadata root does not exist or is not a directory: ${root}`);
    return { ok: false, stats, issues };
  }

  const jsonFiles = walkFiles(root).filter((file) => file.endsWith('.json'));
  stats.jsonFiles = jsonFiles.length;

  const parsedByRel = new Map();
  for (const file of jsonFiles) {
    const rel = normalizeRel(file, root);
    const parsed = parseJson(file, root, issues);
    if (parsed !== undefined) parsedByRel.set(rel, parsed);
  }

  const kindData = collectKindData(root, parsedByRel, issues);
  const dataTypes = collectDataTypes(root, parsedByRel, issues);
  const seenGeneratedUids = new Map();
  const objectUids = new Map();
  const objectNames = new Map();

  for (const [rel, data] of parsedByRel.entries()) {
    if (isUserJson(rel)) stats.userJsonFiles += 1;
    if (getTopLevelObjectInfo(rel)) stats.topLevelObjects += 1;

    checkSchemaPath(root, rel, data, issues);
    checkNames(rel, data, issues);
    collectGeneratedUids(rel, data, issues, seenGeneratedUids);
    checkTopLevelObject(root, rel, data, kindData, dataTypes, objectUids, objectNames, issues);
    checkDataTypeUids(rel, data, dataTypes, issues);
    checkStandardColumns(rel, data, kindData, issues);
    checkDetailServiceColumns(rel, data, kindData, issues);
  }

  stats.generatedUids = seenGeneratedUids.size;
  const ok = !issues.some((issue) => issue.severity === 'error');
  return { ok, stats, issues };
}

function printTextReport(report) {
  const errorCount = report.issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = report.issues.filter((issue) => issue.severity === 'warning').length;
  console.log(report.ok ? 'metadata validation: OK' : 'metadata validation: FAILED');
  console.log(`root: ${report.stats.root}`);
  console.log(`json files: ${report.stats.jsonFiles}`);
  console.log(`user json files: ${report.stats.userJsonFiles}`);
  console.log(`top-level objects: ${report.stats.topLevelObjects}`);
  console.log(`generated uids checked: ${report.stats.generatedUids}`);
  console.log(`errors: ${errorCount}`);
  console.log(`warnings: ${warningCount}`);

  for (const issue of report.issues) {
    console.log(`${issue.severity.toUpperCase()} ${issue.code} ${issue.file} ${issue.location}: ${issue.message}`);
  }
}

function runSelfTest(metadataRoot) {
  const sourceRoot = path.resolve(metadataRoot);
  if (!fs.existsSync(sourceRoot)) {
    console.error(`Cannot run self-test: metadata root does not exist: ${sourceRoot}`);
    return 2;
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'basys-metadata-validator-'));
  const tempMetadata = path.join(tempRoot, 'metadata');
  fs.cpSync(sourceRoot, tempMetadata, { recursive: true });

  const targetFile = path.join(tempMetadata, 'catalog', 'nomenclature', 'catalog.nomenclature.json');
  const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  data.name = 'select';
  data.header.columns[data.header.columns.length - 1].dataSettings.dataTypeUid = '00000000-0000-0000-0000-000000000000';
  fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);

  const report = validate(tempMetadata);
  const codes = new Set(report.issues.map((issue) => issue.code));
  const expected = ['NAME_RESERVED', 'OBJECT_NAME_PATH_MISMATCH', 'DATA_TYPE_UID_UNKNOWN'];
  const missing = expected.filter((code) => !codes.has(code));

  fs.rmSync(tempRoot, { recursive: true, force: true });

  if (missing.length > 0) {
    console.error(`self-test: FAILED, missing expected issue codes: ${missing.join(', ')}`);
    return 1;
  }
  console.log(`self-test: OK, detected expected issue codes: ${expected.join(', ')}`);
  return 0;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    return 0;
  }

  const json = args.includes('--json');
  const selfTest = args.includes('--self-test');
  const rootArg = args.find((arg) => !arg.startsWith('--')) || 'metadata';

  if (selfTest) return runSelfTest(rootArg);

  const report = validate(rootArg);
  if (json) console.log(JSON.stringify(report, null, 2));
  else printTextReport(report);
  return report.ok ? 0 : 1;
}

process.exitCode = main();
