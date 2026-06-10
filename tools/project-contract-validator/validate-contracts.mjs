#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_DESIGN_TOP_LEVEL = [
  'schemaVersion',
  'meta',
  'problem',
  'scope',
  'architectureDecisions',
  'targetArchitecture',
  'acceptanceScenarios',
  'architectureView',
];

const REQUIRED_SPEC_TOP_LEVEL = [
  'schemaVersion',
  'meta',
  'sourceDesign',
  'requirements',
  'metadataRequirements',
  'acceptanceChecks',
];

const REQUIRED_PLAN_TOP_LEVEL = [
  'schemaVersion',
  'meta',
  'sourceSpec',
  'implementationActions',
  'importPlan',
  'selfChecks',
  'acceptanceMapping',
];

const REQUIRED_OBJECT_DECISION_LINK_FIELDS = [
  ['targetArchitecture.metadataObjects', 'sourceDecisionIds'],
];

const REQUIRED_DECISION_LINK_FIELDS = [
  ['targetArchitecture.businessFlows', 'sourceDecisionIds'],
  ['targetArchitecture.dataFlows', 'sourceDecisionIds'],
  ['targetArchitecture.postingFlows', 'sourceDecisionIds'],
  ['acceptanceScenarios', 'coveredDecisionIds'],
];

const LINK_FIELDS = new Map([
  ['sourceDecisionIds', 'DEC'],
  ['coveredDecisionIds', 'DEC'],
  ['coveredObjectIds', null],
  ['coveredObjectId', null],
  ['includes', null],
  ['dependsOn', null],
  ['acceptanceScenarioIds', 'ACC'],
  ['affects', null],
  ['objects', null],
  ['from', null],
  ['to', null],
  ['readBy', null],
  ['targetRecords', null],
  ['items', null],
]);

function usage() {
  return `Usage:
  node tools/project-contract-validator/validate-contracts.mjs <design.json> [--json]
  node tools/project-contract-validator/validate-contracts.mjs --design <design.json> [--spec <spec.json>] [--plan <plan.json>] [--json]
  node tools/project-contract-validator/validate-contracts.mjs --self-test [--json]

Validates project JSON contracts used between Design, Spec, Plan, and implementation.

Arguments:
  design.json       Path to a design JSON contract. Shorthand for --design.
  --design <file>   Path to a design JSON contract.
  --spec <file>     Path to a spec JSON contract.
  --plan <file>     Path to a plan JSON contract.
  --json            Print machine-readable JSON report.
  --self-test       Run in-memory positive and negative fixtures.
`;
}

function addIssue(issues, severity, code, location, message) {
  issues.push({ severity, code, location, message });
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getAtPath(root, dottedPath) {
  return dottedPath.split('.').reduce((current, key) => {
    if (!isObject(current)) return undefined;
    return current[key];
  }, root);
}

function traverse(value, visit, location = '$') {
  if (!isObject(value) && !Array.isArray(value)) return;
  visit(value, location);
  if (Array.isArray(value)) {
    value.forEach((item, index) => traverse(item, visit, `${location}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    traverse(child, visit, `${location}.${key}`);
  }
}

function readJson(file, issues) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    addIssue(issues, 'error', 'JSON_PARSE', '$', error.message);
    return undefined;
  }
}

function collectIds(data, issues) {
  const ids = new Map();
  traverse(data, (node, location) => {
    if (!isObject(node) || typeof node.id !== 'string' || !node.id) return;
    const previous = ids.get(node.id);
    if (previous) {
      addIssue(issues, 'error', 'ID_DUPLICATE', `${location}.id`, `Duplicate id ${node.id}; first seen at ${previous}.`);
      return;
    }
    ids.set(node.id, `${location}.id`);
  });
  return ids;
}

function prefixOf(id) {
  const match = /^([A-Z][A-Z0-9_]*)-/.exec(id);
  return match ? match[1] : null;
}

function normalizeLinks(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  return [];
}

function isValidLinkContainer(value) {
  return typeof value === 'string' || Array.isArray(value);
}

function getFlagValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function checkTopLevelBlocks(data, required, schemaVersion, issues) {
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      addIssue(issues, 'error', 'REQUIRED_BLOCK_MISSING', `$.${key}`, `Missing required top-level block: ${key}.`);
    }
  }

  if (data.schemaVersion !== schemaVersion) {
    addIssue(issues, 'error', 'SCHEMA_VERSION_INVALID', '$.schemaVersion', `Expected schemaVersion = "${schemaVersion}".`);
  }
}

function checkRequiredBlocks(data, issues) {
  checkTopLevelBlocks(data, REQUIRED_DESIGN_TOP_LEVEL, 'design-json-v0.1', issues);

  if (!Array.isArray(data.architectureDecisions) || data.architectureDecisions.length === 0) {
    addIssue(issues, 'error', 'DECISIONS_EMPTY', '$.architectureDecisions', 'architectureDecisions must be a non-empty array.');
  }

  if (!Array.isArray(data.acceptanceScenarios) || data.acceptanceScenarios.length === 0) {
    addIssue(issues, 'error', 'ACCEPTANCE_EMPTY', '$.acceptanceScenarios', 'acceptanceScenarios must be a non-empty array.');
  }
}

function checkDecisionEvidence(data, issues) {
  if (!Array.isArray(data.architectureDecisions)) return;
  data.architectureDecisions.forEach((decision, index) => {
    const location = `$.architectureDecisions[${index}]`;
    if (!isObject(decision)) {
      addIssue(issues, 'error', 'DECISION_INVALID', location, 'Decision must be an object.');
      return;
    }
    if (typeof decision.id !== 'string' || !decision.id.startsWith('DEC-')) {
      addIssue(issues, 'error', 'DECISION_ID_INVALID', `${location}.id`, 'Decision id must start with DEC-.');
    }
    if (typeof decision.decision !== 'string' || !decision.decision.trim()) {
      addIssue(issues, 'error', 'DECISION_TEXT_MISSING', `${location}.decision`, 'Decision text is required.');
    }
    if (typeof decision.rationale !== 'string' || !decision.rationale.trim()) {
      addIssue(issues, 'error', 'DECISION_RATIONALE_MISSING', `${location}.rationale`, 'Decision rationale is required.');
    }
    if (decision.evidenceRequired === false) return;
    if (!Array.isArray(decision.evidence) || decision.evidence.length === 0) {
      addIssue(issues, 'error', 'DECISION_EVIDENCE_MISSING', `${location}.evidence`, 'Decision must have evidence, or set evidenceRequired=false for explicitly non-platform/domain-only decisions.');
    }
  });
}

function checkRequiredSourceLinks(data, issues) {
  for (const [arrayPath, field] of REQUIRED_OBJECT_DECISION_LINK_FIELDS) {
    const items = getAtPath(data, arrayPath);
    if (!Array.isArray(items)) continue;
    items.forEach((item, index) => {
      if (!isObject(item)) return;
      if (!Array.isArray(item[field]) || item[field].length === 0) {
        addIssue(issues, 'error', 'SOURCE_DECISION_MISSING', `$.${arrayPath}[${index}].${field}`, `${arrayPath}[${index}] must reference at least one architecture decision.`);
      }
    });
  }

  for (const [arrayPath, field] of REQUIRED_DECISION_LINK_FIELDS) {
    const items = getAtPath(data, arrayPath);
    if (!Array.isArray(items)) continue;
    items.forEach((item, index) => {
      if (!isObject(item)) return;
      if (!Array.isArray(item[field]) || item[field].length === 0) {
        addIssue(issues, 'error', 'DECISION_COVERAGE_MISSING', `$.${arrayPath}[${index}].${field}`, `${arrayPath}[${index}] must reference at least one architecture decision.`);
      }
    });
  }
}

function checkLinks(data, ids, issues) {
  traverse(data, (node, location) => {
    if (!isObject(node)) return;
    for (const [field, requiredPrefix] of LINK_FIELDS.entries()) {
      if (!Object.prototype.hasOwnProperty.call(node, field)) continue;
      if (!isValidLinkContainer(node[field])) {
        addIssue(issues, 'warning', 'LINK_FIELD_INVALID_TYPE', `${location}.${field}`, `${field} should be a string id or an array of string ids.`);
        continue;
      }
      const links = normalizeLinks(node[field]);
      links.forEach((id) => {
        if (!ids.has(id)) {
          addIssue(issues, 'error', 'LINK_UNRESOLVED', `${location}.${field}`, `Unresolved id reference: ${id}. Declare it in the contract, even if it is an existing/external object.`);
          return;
        }
        if (requiredPrefix && prefixOf(id) !== requiredPrefix) {
          addIssue(issues, 'error', 'LINK_PREFIX_INVALID', `${location}.${field}`, `Expected ${field} to reference ${requiredPrefix}-* id, got ${id}.`);
        }
      });
    }
  });
}

function checkArchitectureView(data, ids, issues) {
  const sections = data.architectureView?.sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    addIssue(issues, 'warning', 'ARCHITECTURE_VIEW_EMPTY', '$.architectureView.sections', 'architectureView.sections should explain how to render the architecture for humans.');
    return;
  }
  sections.forEach((section, index) => {
    if (!isObject(section)) return;
    if (!Array.isArray(section.items) || section.items.length === 0) {
      addIssue(issues, 'warning', 'ARCHITECTURE_VIEW_SECTION_EMPTY', `$.architectureView.sections[${index}].items`, 'Architecture view section has no items.');
    }
  });
}

function validateDesignData(data) {
  const issues = [];
  if (!isObject(data)) {
    addIssue(issues, 'error', 'ROOT_INVALID', '$', 'Design contract root must be a JSON object.');
    return reportFromIssues(issues);
  }

  checkRequiredBlocks(data, issues);
  const ids = collectIds(data, issues);
  checkDecisionEvidence(data, issues);
  checkRequiredSourceLinks(data, issues);
  checkLinks(data, ids, issues);
  checkArchitectureView(data, ids, issues);

  return reportFromIssues(issues);
}

function checkSpecRequiredBlocks(data, issues) {
  checkTopLevelBlocks(data, REQUIRED_SPEC_TOP_LEVEL, 'spec-json-v0.1', issues);
  if (!Array.isArray(data.requirements) || data.requirements.length === 0) {
    addIssue(issues, 'error', 'REQUIREMENTS_EMPTY', '$.requirements', 'requirements must be a non-empty array.');
  }
}

function checkPlanRequiredBlocks(data, issues) {
  checkTopLevelBlocks(data, REQUIRED_PLAN_TOP_LEVEL, 'plan-json-v0.1', issues);
  if (!Array.isArray(data.implementationActions) || data.implementationActions.length === 0) {
    addIssue(issues, 'error', 'ACTIONS_EMPTY', '$.implementationActions', 'implementationActions must be a non-empty array.');
  }
}

function validateSpecData(data) {
  const issues = [];
  if (!isObject(data)) {
    addIssue(issues, 'error', 'ROOT_INVALID', '$', 'Spec contract root must be a JSON object.');
    return reportFromIssues(issues);
  }

  checkSpecRequiredBlocks(data, issues);
  collectIds(data, issues);

  return reportFromIssues(issues);
}

function validatePlanData(data) {
  const issues = [];
  if (!isObject(data)) {
    addIssue(issues, 'error', 'ROOT_INVALID', '$', 'Plan contract root must be a JSON object.');
    return reportFromIssues(issues);
  }

  checkPlanRequiredBlocks(data, issues);
  collectIds(data, issues);
  checkPlanTargetPaths(data, issues);

  return reportFromIssues(issues);
}

function appendPrefixedIssues(target, source, prefix) {
  for (const issue of source.issues) {
    target.push({ ...issue, location: `${prefix}${issue.location.slice(1)}` });
  }
}

function collectDeferredIds(items) {
  const result = new Set();
  if (!Array.isArray(items)) return result;
  items.forEach((item) => {
    if (typeof item === 'string') {
      result.add(item);
      return;
    }
    if (!isObject(item)) return;
    for (const key of ['id', 'objectId', 'architectureObjectId', 'requirementId', 'targetId']) {
      if (typeof item[key] === 'string') result.add(item[key]);
    }
  });
  return result;
}

function requireRefsExist(refs, targetIds, issues, location, code, label) {
  normalizeLinks(refs).forEach((id) => {
    if (!targetIds.has(id)) {
      addIssue(issues, 'error', code, location, `${label} reference does not exist: ${id}.`);
    }
  });
}

function checkSpecAgainstDesign(spec, design, designIds, issues) {
  const designMetaId = design.meta?.id;
  const specSourceId = spec.meta?.sourceDesignId;
  if (designMetaId && specSourceId && specSourceId !== designMetaId) {
    addIssue(issues, 'error', 'SPEC_SOURCE_DESIGN_MISMATCH', '$.spec.meta.sourceDesignId', `Expected sourceDesignId ${designMetaId}, got ${specSourceId}.`);
  }

  const requirements = Array.isArray(spec.requirements) ? spec.requirements : [];
  requirements.forEach((requirement, index) => {
    if (!isObject(requirement)) return;
    const base = `$.spec.requirements[${index}]`;
    requireRefsExist(requirement.sourceDecisionIds, designIds, issues, `${base}.sourceDecisionIds`, 'SPEC_DECISION_REF_MISSING', 'sourceDecisionIds');
    requireRefsExist(requirement.sourceArchitectureObjectIds, designIds, issues, `${base}.sourceArchitectureObjectIds`, 'SPEC_ARCH_OBJECT_REF_MISSING', 'sourceArchitectureObjectIds');
    requireRefsExist(requirement.acceptanceScenarioIds, designIds, issues, `${base}.acceptanceScenarioIds`, 'SPEC_ACCEPTANCE_REF_MISSING', 'acceptanceScenarioIds');
  });

  const metadataRequirements = Array.isArray(spec.metadataRequirements) ? spec.metadataRequirements : [];
  const specIds = collectIds(spec, []);
  metadataRequirements.forEach((requirement, index) => {
    if (!isObject(requirement)) return;
    requireRefsExist(requirement.sourceRequirementIds, specIds, issues, `$.spec.metadataRequirements[${index}].sourceRequirementIds`, 'SPEC_REQUIREMENT_REF_MISSING', 'sourceRequirementIds');
  });

  const checks = Array.isArray(spec.acceptanceChecks) ? spec.acceptanceChecks : [];
  checks.forEach((check, index) => {
    if (!isObject(check)) return;
    const base = `$.spec.acceptanceChecks[${index}]`;
    requireRefsExist(check.sourceAcceptanceScenarioIds, designIds, issues, `${base}.sourceAcceptanceScenarioIds`, 'SPEC_ACCEPTANCE_REF_MISSING', 'sourceAcceptanceScenarioIds');
    requireRefsExist(check.sourceRequirementIds, specIds, issues, `${base}.sourceRequirementIds`, 'SPEC_REQUIREMENT_REF_MISSING', 'sourceRequirementIds');
  });

  checkDesignObjectCoverageBySpec(design, spec, issues);
}

function checkDesignObjectCoverageBySpec(design, spec, issues) {
  const deferred = collectDeferredIds(spec.deferred);
  const covered = new Set();
  const requirements = Array.isArray(spec.requirements) ? spec.requirements : [];
  requirements.forEach((requirement) => {
    normalizeLinks(requirement?.sourceArchitectureObjectIds).forEach((id) => covered.add(id));
    if (typeof requirement?.objectId === 'string') covered.add(requirement.objectId);
  });

  const objects = design.targetArchitecture?.metadataObjects;
  if (!Array.isArray(objects)) return;
  objects.forEach((object, index) => {
    if (!isObject(object) || typeof object.id !== 'string') return;
    if (!covered.has(object.id) && !deferred.has(object.id)) {
      addIssue(issues, 'error', 'SPEC_OBJECT_NOT_COVERED', `$.design.targetArchitecture.metadataObjects[${index}].id`, `Architecture object ${object.id} is not covered by spec.requirements and is not deferred.`);
    }
  });
}

function checkPlanAgainstSpec(plan, spec, issues) {
  const specMetaId = spec.meta?.id;
  const planSourceId = plan.meta?.sourceSpecId;
  if (specMetaId && planSourceId && planSourceId !== specMetaId) {
    addIssue(issues, 'error', 'PLAN_SOURCE_SPEC_MISMATCH', '$.plan.meta.sourceSpecId', `Expected sourceSpecId ${specMetaId}, got ${planSourceId}.`);
  }

  const specIds = collectIds(spec, []);
  const planIds = collectIds(plan, []);
  const actions = Array.isArray(plan.implementationActions) ? plan.implementationActions : [];
  actions.forEach((action, index) => {
    if (!isObject(action)) return;
    const base = `$.plan.implementationActions[${index}]`;
    requireRefsExist(action.sourceRequirementIds, specIds, issues, `${base}.sourceRequirementIds`, 'PLAN_REQUIREMENT_REF_MISSING', 'sourceRequirementIds');
    requireRefsExist(action.sourceMetadataRequirementIds, specIds, issues, `${base}.sourceMetadataRequirementIds`, 'PLAN_METADATA_REQUIREMENT_REF_MISSING', 'sourceMetadataRequirementIds');
    requireRefsExist(action.dependsOn, planIds, issues, `${base}.dependsOn`, 'PLAN_ACTION_REF_MISSING', 'dependsOn');
  });

  const checks = Array.isArray(plan.selfChecks) ? plan.selfChecks : [];
  checks.forEach((check, index) => {
    if (!isObject(check)) return;
    requireRefsExist(check.sourceActionIds, planIds, issues, `$.plan.selfChecks[${index}].sourceActionIds`, 'PLAN_ACTION_REF_MISSING', 'sourceActionIds');
  });

  const acceptance = Array.isArray(plan.acceptanceMapping) ? plan.acceptanceMapping : [];
  acceptance.forEach((mapping, index) => {
    if (!isObject(mapping)) return;
    const base = `$.plan.acceptanceMapping[${index}]`;
    requireRefsExist(mapping.acceptanceCheckId, specIds, issues, `${base}.acceptanceCheckId`, 'PLAN_ACCEPTANCE_CHECK_REF_MISSING', 'acceptanceCheckId');
    requireRefsExist(mapping.sourceActionIds, planIds, issues, `${base}.sourceActionIds`, 'PLAN_ACTION_REF_MISSING', 'sourceActionIds');
  });

  checkSpecRequirementCoverageByPlan(spec, plan, issues);
}

function checkSpecRequirementCoverageByPlan(spec, plan, issues) {
  const deferred = collectDeferredIds(plan.deferred);
  const covered = new Set();
  const actions = Array.isArray(plan.implementationActions) ? plan.implementationActions : [];
  actions.forEach((action) => {
    normalizeLinks(action?.sourceRequirementIds).forEach((id) => covered.add(id));
  });

  const requirements = Array.isArray(spec.requirements) ? spec.requirements : [];
  requirements.forEach((requirement, index) => {
    if (!isObject(requirement) || typeof requirement.id !== 'string') return;
    if (!covered.has(requirement.id) && !deferred.has(requirement.id)) {
      addIssue(issues, 'error', 'PLAN_REQUIREMENT_NOT_COVERED', `$.spec.requirements[${index}].id`, `Requirement ${requirement.id} is not covered by plan.implementationActions and is not deferred.`);
    }
  });
}

function checkPlanTargetPaths(plan, issues) {
  const actions = Array.isArray(plan.implementationActions) ? plan.implementationActions : [];
  actions.forEach((action, index) => {
    if (!isObject(action) || typeof action.targetPath !== 'string' || !action.targetPath) return;
    const normalized = action.targetPath.replaceAll('\\', '/');
    if (path.isAbsolute(action.targetPath) || normalized.includes('../')) {
      addIssue(issues, 'error', 'PLAN_TARGET_PATH_UNSAFE', `$.implementationActions[${index}].targetPath`, `targetPath must be a safe workspace-relative path: ${action.targetPath}`);
      return;
    }
    if (!normalized.startsWith('metadata/') && !normalized.startsWith('project/docs/specs/')) {
      addIssue(issues, 'error', 'PLAN_TARGET_PATH_FORBIDDEN', `$.implementationActions[${index}].targetPath`, `targetPath must be under metadata/ or project/docs/specs/: ${action.targetPath}`);
    }
  });
}

function validateContractSet({ design, spec, plan }) {
  const issues = [];
  const designReport = design === undefined ? undefined : validateDesignData(design);
  if (designReport) appendPrefixedIssues(issues, designReport, '$.design');

  const specReport = spec === undefined ? undefined : validateSpecData(spec);
  if (specReport) appendPrefixedIssues(issues, specReport, '$.spec');

  const planReport = plan === undefined ? undefined : validatePlanData(plan);
  if (planReport) appendPrefixedIssues(issues, planReport, '$.plan');

  if (design && spec) checkSpecAgainstDesign(spec, design, collectIds(design, []), issues);
  if (spec && plan) checkPlanAgainstSpec(plan, spec, issues);

  return reportFromIssues(issues);
}

function reportFromIssues(issues) {
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  return {
    ok: errors === 0,
    errors,
    warnings,
    issues,
  };
}

function printTextReport(report, label) {
  const prefix = label ? `${label}: ` : '';
  console.log(`${prefix}${report.ok ? 'OK' : 'FAILED'} (${report.errors} errors, ${report.warnings} warnings)`);
  for (const issue of report.issues) {
    console.log(`${issue.severity.toUpperCase()} ${issue.code} ${issue.location}: ${issue.message}`);
  }
}

function runSelfTest(jsonOutput) {
  const validDesign = {
    schemaVersion: 'design-json-v0.1',
    meta: { id: 'sp-test', title: 'Test', status: 'design', version: 1 },
    problem: { summary: 'Test', businessGoal: 'Test', targetUsers: ['PM'] },
    scope: { inScope: ['A'], outOfScope: ['B'] },
    architectureDecisions: [
      {
        id: 'DEC-001',
        title: 'Use records',
        decision: 'Create a records object.',
        rationale: 'Movements must be accumulated.',
        evidence: [{ type: 'basys-docs', path: 'basys-docs/ru/metadata/recordsCreation.md' }],
        affects: ['RECORDS-test'],
        status: 'accepted',
      },
    ],
    targetArchitecture: {
      metadataObjects: [
        { id: 'RECORDS-test', kind: 'records', name: 'test', title: 'Test', purpose: 'Test', sourceDecisionIds: ['DEC-001'] },
      ],
      businessFlows: [
        { id: 'FLOW-test', title: 'Test flow', summary: 'Test', actors: ['User'], steps: ['Do it'], objects: ['RECORDS-test'], sourceDecisionIds: ['DEC-001'] },
      ],
      dataFlows: [],
      postingFlows: [],
      commands: [],
      workflows: [],
      reports: [],
      menus: [],
      externalIntegrations: [],
      manualSteps: [],
    },
    implementationPhases: [
      { id: 'PHASE-001', title: 'Phase', goal: 'Test', includes: ['RECORDS-test'], dependsOn: [], acceptanceScenarioIds: ['ACC-001'] },
    ],
    acceptanceScenarios: [
      { id: 'ACC-001', title: 'Accept', role: 'PM', preconditions: [], steps: ['Check'], expectedResult: 'Works', coveredDecisionIds: ['DEC-001'], coveredObjectIds: ['RECORDS-test'] },
    ],
    openQuestions: [],
    risks: [],
    architectureView: {
      summary: 'Test architecture.',
      sections: [{ id: 'VIEW-001', title: 'Main', items: ['FLOW-test', 'RECORDS-test'] }],
      suggestedDiagrams: [],
    },
    extensionBlocks: [],
  };

  const validSpec = {
    schemaVersion: 'spec-json-v0.1',
    meta: { id: 'sp-test-spec', title: 'Test spec', status: 'review', version: 1, sourceDesignId: 'sp-test' },
    sourceDesign: { file: 'project/docs/specs/sp-test.design.json', designVersion: 1 },
    requirements: [
      {
        id: 'REQ-001',
        title: 'Create records object',
        type: 'metadata-object',
        objectId: 'RECORDS-test',
        requirement: 'The system must store test movements in records/test.',
        sourceDecisionIds: ['DEC-001'],
        sourceArchitectureObjectIds: ['RECORDS-test'],
        acceptanceScenarioIds: ['ACC-001'],
      },
    ],
    metadataRequirements: [
      {
        id: 'MREQ-001',
        objectId: 'RECORDS-test',
        kind: 'records',
        name: 'test',
        title: 'Test',
        headerColumns: [],
        detailTables: [],
        recordsSettings: [],
        commands: [],
        forms: [],
        sourceRequirementIds: ['REQ-001'],
      },
    ],
    acceptanceChecks: [
      {
        id: 'CHECK-001',
        title: 'Check records object',
        steps: ['Open records/test'],
        expectedResult: 'Object exists.',
        sourceAcceptanceScenarioIds: ['ACC-001'],
        sourceRequirementIds: ['REQ-001'],
      },
    ],
    deferred: [],
    openQuestions: [],
    risks: [],
  };

  const validPlan = {
    schemaVersion: 'plan-json-v0.1',
    meta: { id: 'sp-test-plan', title: 'Test plan', status: 'review', version: 1, sourceSpecId: 'sp-test-spec' },
    sourceSpec: { file: 'project/docs/specs/sp-test.spec.json', specVersion: 1 },
    implementationActions: [
      {
        id: 'ACT-001',
        title: 'Create records/test',
        type: 'create-metadata-object',
        targetPath: 'metadata/records/test/records.test.json',
        objectId: 'RECORDS-test',
        sourceRequirementIds: ['REQ-001'],
        sourceMetadataRequirementIds: ['MREQ-001'],
        dependsOn: [],
        checks: [],
      },
    ],
    importPlan: { order: ['metadata/records/test/records.test.json'], notes: [] },
    selfChecks: [
      { id: 'SELF-001', title: 'Validate metadata', command: 'node tools/metadata-validator/validate-metadata.mjs metadata', sourceActionIds: ['ACT-001'] },
    ],
    acceptanceMapping: [
      { acceptanceCheckId: 'CHECK-001', sourceActionIds: ['ACT-001'] },
    ],
    deferred: [],
    risks: [],
  };

  const invalidDesign = structuredClone(validDesign);
  invalidDesign.architectureDecisions[0].evidence = [];
  invalidDesign.targetArchitecture.metadataObjects[0].sourceDecisionIds = [];
  invalidDesign.acceptanceScenarios[0].coveredDecisionIds = ['DEC-MISSING'];
  invalidDesign.architectureView.sections[0].items = ['FLOW-MISSING'];

  const invalidSpec = structuredClone(validSpec);
  invalidSpec.requirements[0].sourceDecisionIds = ['DEC-MISSING'];
  invalidSpec.requirements[0].sourceArchitectureObjectIds = [];

  const invalidPlan = structuredClone(validPlan);
  invalidPlan.implementationActions[0].sourceRequirementIds = ['REQ-MISSING'];
  invalidPlan.implementationActions[0].targetPath = '../outside.json';

  const validReport = validateContractSet({ design: validDesign, spec: validSpec, plan: validPlan });
  const invalidReport = validateContractSet({ design: invalidDesign, spec: invalidSpec, plan: invalidPlan });
  const selfTestOk = validReport.ok && !invalidReport.ok;
  const report = { ok: selfTestOk, validReport, invalidReport };

  if (jsonOutput) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`SELF-TEST ${selfTestOk ? 'OK' : 'FAILED'}`);
    printTextReport(validReport, 'valid fixture');
    printTextReport(invalidReport, 'invalid fixture');
  }

  return selfTestOk ? 0 : 1;
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const selfTest = args.includes('--self-test');
  const designFlag = getFlagValue(args, '--design');
  const specFlag = getFlagValue(args, '--spec');
  const planFlag = getFlagValue(args, '--plan');
  const valuesConsumedByFlags = new Set([designFlag, specFlag, planFlag].filter(Boolean));
  const positional = args.filter((arg) => !arg.startsWith('--') && !valuesConsumedByFlags.has(arg));

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    return 0;
  }

  if (selfTest) return runSelfTest(jsonOutput);

  const designPath = designFlag || positional[0];
  if (!designPath || positional.length > (designFlag ? 0 : 1)) {
    console.error(usage());
    return 2;
  }

  const loadIssues = [];
  const designFile = path.resolve(designPath);
  const specFile = specFlag ? path.resolve(specFlag) : undefined;
  const planFile = planFlag ? path.resolve(planFlag) : undefined;
  const design = readJson(designFile, loadIssues);
  const spec = specFile ? readJson(specFile, loadIssues) : undefined;
  const plan = planFile ? readJson(planFile, loadIssues) : undefined;
  const report = loadIssues.length > 0
    ? reportFromIssues(loadIssues)
    : validateContractSet({ design, spec, plan });

  const files = {
    design: designFile,
    ...(specFile ? { spec: specFile } : {}),
    ...(planFile ? { plan: planFile } : {}),
  };

  if (jsonOutput) console.log(JSON.stringify({ files, ...report }, null, 2));
  else printTextReport(report, Object.values(files).join(' -> '));

  return report.ok ? 0 : 1;
}

process.exitCode = main();
