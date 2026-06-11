# -*- coding: utf-8 -*-
"""Generate the as-built architecture view from actual BaSYS metadata.

The tool scans ``metadata/`` (read-only input), builds a dataset in the
``architecture-view-json-v0.1`` format and writes it to
``project/docs/specs/sp-001-bakery-stage1b.metadata-view.json``.

It then regenerates ``project/docs/specs/sp-001-bakery-stage1b.architecture-view.html``
as a self-contained two-tab viewer:

* tab «Дизайн»          — the design dataset taken verbatim from
                          ``sp-001-bakery-stage1b.architecture-view.json``;
* tab «Metadata (факт)» — the freshly generated as-built dataset.

The HTML template embedded below is derived from the original single-tab
viewer (same CSS/JS/cytoscape rendering); generating it from the embedded
template makes the run idempotent: re-running the script produces byte
identical output as long as the inputs do not change (no timestamps).

Usage (from the workspace root)::

    python project/tools/build_arch_view.py

Only Python 3 stdlib is used.
"""

import argparse
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path

# --------------------------------------------------------------------------
# Constants / conventions
# --------------------------------------------------------------------------

SCAN_KINDS = ["operation", "records", "catalog", "enum", "register", "data_view", "workflow"]

ID_PREFIX = {
    "operation": "OP",
    "records": "RECORDS",
    "catalog": "CAT",
    "enum": "ENUM",
    "register": "REG",
    "data_view": "REPORT",
    "workflow": "WF",
}

VISUAL_TYPE = {
    "operation": "document",
    "records": "storage",
    "catalog": "reference",
    "enum": "reference",
    "register": "reference",
    "data_view": "report",
    "workflow": "calculation",
}

KIND_ORDER = {kind: index for index, kind in enumerate(SCAN_KINDS)}

# kinds whose reference (FK) columns are turned into "references" edges.
# The spec asked for operation/records/catalog; register is added on purpose
# (recipe_component -> recipe / nomenclature, price_list -> nomenclature are
# meaningful as-built links).
FK_SOURCE_KINDS = {"operation", "records", "catalog", "register"}

FROM_RE = re.compile(r"""from\(\s*['"]([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)""")
RUN_WORKFLOW_RE = re.compile(r"""runWorkflow\(\s*['"](\w+)['"]""")

DIRECTION_TITLE = {0: "приход (+)", 1: "расход (−)"}


def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def read_text(path):
    with open(path, "r", encoding="utf-8-sig") as handle:
        return handle.read()


# --------------------------------------------------------------------------
# Metadata scanning
# --------------------------------------------------------------------------

def scan_metadata(metadata_dir):
    """Return (objects, uid_index, dtype_index, warnings).

    objects: list of dicts {kind, name, title, memo, uid, dir, settings}
    uid_index: metaobject uid -> object dict
    dtype_index: dataTypeUid -> (kind, name) for non-primitive reference types
    """
    objects = []
    warnings = []

    for kind in SCAN_KINDS:
        kind_dir = metadata_dir / kind
        if not kind_dir.is_dir():
            continue
        for obj_dir in sorted(kind_dir.iterdir()):
            if not obj_dir.is_dir():
                continue
            settings_path = obj_dir / "{0}.{1}.json".format(kind, obj_dir.name)
            if not settings_path.is_file():
                warnings.append("settings file not found: {0}".format(settings_path))
                continue
            settings = load_json(settings_path)
            objects.append({
                "kind": kind,
                "name": settings.get("name") or obj_dir.name,
                "title": settings.get("title") or obj_dir.name,
                "memo": (settings.get("memo") or "").strip(),
                "uid": settings.get("uid"),
                "dir": obj_dir,
                "settings": settings,
            })

    uid_index = {}
    for obj in objects:
        if obj["uid"]:
            uid_index[obj["uid"]] = obj

    dtype_index = {}
    dtypes_path = metadata_dir / "system" / "dataTypes.json"
    if dtypes_path.is_file():
        for dtype in load_json(dtypes_path):
            if not dtype.get("isPrimitive") and dtype.get("kind") and dtype.get("name"):
                dtype_index[dtype["uid"]] = (dtype["kind"], dtype["name"])
    else:
        warnings.append("system/dataTypes.json not found; FK edges skipped")

    return objects, uid_index, dtype_index, warnings


def node_id(kind, name):
    return "{0}-{1}".format(ID_PREFIX[kind], name)


# --------------------------------------------------------------------------
# Edge collection
# --------------------------------------------------------------------------

class EdgeBag(object):
    """Collects edges and merges duplicates by (from, to, type)."""

    def __init__(self):
        self._edges = OrderedDict()

    def add(self, from_id, to_id, edge_type, title, description):
        key = (from_id, to_id, edge_type)
        if key in self._edges:
            edge = self._edges[key]
            if description and description not in edge["pmDescription"]:
                edge["pmDescription"] = edge["pmDescription"].rstrip() + " " + description
        else:
            self._edges[key] = {
                "id": "EDGE-{0}-{1}-{2}".format(edge_type, from_id, to_id),
                "from": from_id,
                "to": to_id,
                "type": edge_type,
                "title": title,
                "pmDescription": description,
            }

    def sorted_list(self):
        type_order = ["writes", "reads", "calculates", "fills", "references"]
        rank = {etype: index for index, etype in enumerate(type_order)}
        return sorted(
            self._edges.values(),
            key=lambda e: (rank.get(e["type"], 99), e["from"], e["to"]),
        )


def table_names_by_uid(settings):
    """Map table uid -> human readable table name for an operation."""
    result = {}
    header = settings.get("header") or {}
    if header.get("uid"):
        result[header["uid"]] = "шапка"
    for table in settings.get("detailTables") or []:
        if table.get("uid"):
            result[table["uid"]] = "ТЧ «{0}»".format(table.get("title") or table.get("name"))
    return result


def parse_bjs_objects(text):
    """Extract (kind, name) pairs referenced through from('kind.name...')."""
    found = []
    for match in FROM_RE.finditer(text):
        pair = (match.group(1), match.group(2))
        if pair not in found:
            found.append(pair)
    return found


def collect_edges(objects, uid_index, dtype_index, warnings):
    edges = EdgeBag()
    by_kind_name = {(obj["kind"], obj["name"]): obj for obj in objects}

    def resolve(kind, name, context):
        obj = by_kind_name.get((kind, name))
        if obj is None:
            warnings.append("unresolved object {0}.{1} referenced in {2}".format(kind, name, context))
        return obj

    for obj in objects:
        settings = obj["settings"]

        # -- 1. operation -> records (posting, recordsSettings) -------------
        if obj["kind"] == "operation":
            tables = table_names_by_uid(settings)
            for block in settings.get("recordsSettings") or []:
                dest_uid = block.get("destinationMetaObjectUid")
                dest = uid_index.get(dest_uid)
                if dest is None:
                    warnings.append(
                        "recordsSettings of operation {0}: unknown destination uid {1}".format(obj["name"], dest_uid))
                    continue
                directions = []
                sources = []
                for row in block.get("rows") or []:
                    direction = row.get("direction")
                    if direction not in directions:
                        directions.append(direction)
                    source = tables.get(row.get("sourceUid"), "?")
                    if source not in sources:
                        sources.append(source)
                title = " и ".join(DIRECTION_TITLE.get(d, str(d)) for d in sorted(directions))
                description = (
                    "Проведение: «{0}» пишет движения в «{1}» ({2}; источник строк: {3}).".format(
                        obj["title"], dest["title"], title, ", ".join(sources)))
                edges.add(node_id(obj["kind"], obj["name"]), node_id(dest["kind"], dest["name"]),
                          "writes", title, description)

            # -- 2. command scripts of the operation ------------------------
            for command in settings.get("commands") or []:
                expression = command.get("expression") or ""
                if not expression.endswith(".bjs"):
                    continue
                script_path = obj["dir"] / Path(expression).name
                if not script_path.is_file():
                    warnings.append("command script not found: {0}".format(script_path))
                    continue
                text = read_text(script_path)
                context = "command {0}.{1}".format(obj["name"], command.get("name"))
                for kind, name in parse_bjs_objects(text):
                    src = resolve(kind, name, context)
                    if src is None or src is obj:
                        continue
                    description = "Команда «{0}» читает данные из «{1}».".format(
                        command.get("title") or command.get("name"), src["title"])
                    edges.add(node_id(src["kind"], src["name"]), node_id(obj["kind"], obj["name"]),
                              "reads", "чтение командой", description)
                for wf_name in RUN_WORKFLOW_RE.findall(text):
                    wf = resolve("workflow", wf_name, context)
                    if wf is None:
                        continue
                    description = "Команда «{0}» операции «{1}» запускает workflow «{2}».".format(
                        command.get("title") or command.get("name"), obj["title"], wf["title"])
                    edges.add(node_id("workflow", wf["name"]), node_id(obj["kind"], obj["name"]),
                              "calculates", "расчёт workflow", description)

        # -- 3. data_view data sources --------------------------------------
        if obj["kind"] == "data_view":
            for source in settings.get("dataSources") or []:
                expression = source.get("expression") or ""
                if not expression.endswith(".bjs"):
                    continue
                script_path = obj["dir"] / Path(expression).name
                if not script_path.is_file():
                    warnings.append("data source script not found: {0}".format(script_path))
                    continue
                text = read_text(script_path)
                context = "data_view {0} source {1}".format(obj["name"], source.get("name"))
                for kind, name in parse_bjs_objects(text):
                    src = resolve(kind, name, context)
                    if src is None:
                        continue
                    description = "Отчёт «{0}» читает данные из «{1}».".format(obj["title"], src["title"])
                    edges.add(node_id(src["kind"], src["name"]), node_id(obj["kind"], obj["name"]),
                              "reads", "данные отчёта", description)

        # -- 4. workflow steps ----------------------------------------------
        if obj["kind"] == "workflow":
            for step in settings.get("steps") or []:
                step_title = step.get("title") or step.get("name")
                target_uid = step.get("metaObjectUid")
                if target_uid:
                    target = uid_index.get(target_uid)
                    if target is None:
                        warnings.append("workflow {0} step {1}: unknown target uid {2}".format(
                            obj["name"], step.get("name"), target_uid))
                    else:
                        description = "Workflow «{0}» создаёт/обновляет объекты «{1}» (шаг «{2}»).".format(
                            obj["title"], target["title"], step_title)
                        edges.add(node_id("workflow", obj["name"]), node_id(target["kind"], target["name"]),
                                  "fills", "заполняет данными", description)
                expression = step.get("expression") or ""
                if expression.endswith(".bjs"):
                    script_path = obj["dir"] / Path(expression).name
                    if not script_path.is_file():
                        warnings.append("workflow step script not found: {0}".format(script_path))
                        continue
                    text = read_text(script_path)
                    context = "workflow {0} step {1}".format(obj["name"], step.get("name"))
                    for kind, name in parse_bjs_objects(text):
                        src = resolve(kind, name, context)
                        if src is None:
                            continue
                        description = "Шаг «{0}» workflow «{1}» читает данные из «{2}».".format(
                            step_title, obj["title"], src["title"])
                        edges.add(node_id(src["kind"], src["name"]), node_id("workflow", obj["name"]),
                                  "reads", "чтение в workflow", description)

        # -- 5. FK reference columns ----------------------------------------
        if obj["kind"] in FK_SOURCE_KINDS:
            fk_columns = {}
            column_sets = []
            header = settings.get("header") or {}
            column_sets.append(("шапка", header.get("columns") or []))
            for table in settings.get("detailTables") or []:
                column_sets.append(("ТЧ «{0}»".format(table.get("title") or table.get("name")),
                                    table.get("columns") or []))
            for _table_label, columns in column_sets:
                for column in columns:
                    dtype_uid = (column.get("dataSettings") or {}).get("dataTypeUid")
                    ref = dtype_index.get(dtype_uid)
                    if ref is None:
                        continue
                    target = by_kind_name.get(ref)
                    if target is None or target is obj:
                        continue
                    key = (target["kind"], target["name"])
                    fk_columns.setdefault(key, [])
                    column_label = column.get("name") or column.get("title")
                    if column_label not in fk_columns[key]:
                        fk_columns[key].append(column_label)
            for (target_kind, target_name), columns in fk_columns.items():
                target = by_kind_name[(target_kind, target_name)]
                description = "«{0}» ссылается на «{1}» (колонки: {2}).".format(
                    obj["title"], target["title"], ", ".join(columns))
                edges.add(node_id(obj["kind"], obj["name"]), node_id(target_kind, target_name),
                          "references", "ссылка (FK)", description)

    return edges.sorted_list()


# --------------------------------------------------------------------------
# Dataset assembly
# --------------------------------------------------------------------------

def build_nodes(objects):
    nodes = []
    for obj in sorted(objects, key=lambda o: (KIND_ORDER[o["kind"]], o["name"])):
        nodes.append({
            "id": node_id(obj["kind"], obj["name"]),
            "kind": obj["kind"],
            "name": obj["name"],
            "title": obj["title"],
            "lifecycle": "as-built",
            "pmDescription": obj["memo"] or obj["title"],
            "visualType": VISUAL_TYPE[obj["kind"]],
        })
    return nodes


def build_groups(nodes):
    def ids(kinds):
        return [node["id"] for node in nodes if node["kind"] in kinds]

    return [
        {
            "id": "GROUP-fact-documents",
            "title": "Документы (операции)",
            "description": "Фактические операции стенда: документы, которые проводит пользователь.",
            "nodeIds": ids({"operation"}),
        },
        {
            "id": "GROUP-fact-storage",
            "title": "Регистры записей (движения)",
            "description": "Records-регистры, в которые операции пишут движения при проведении.",
            "nodeIds": ids({"records"}),
        },
        {
            "id": "GROUP-fact-inputs",
            "title": "Справочники и входные данные",
            "description": "Catalog, enum и register: НСИ и настройки, на которые ссылаются документы и регистры.",
            "nodeIds": ids({"catalog", "enum", "register"}),
        },
        {
            "id": "GROUP-fact-reports",
            "title": "Отчёты (data view)",
            "description": "Отчёты, которые читают данные из регистров записей.",
            "nodeIds": ids({"data_view"}),
        },
        {
            "id": "GROUP-fact-workflows",
            "title": "Расчёты и заполнение (workflow)",
            "description": "Workflow-процессы: расчёт потребности и первоначальное заполнение данных.",
            "nodeIds": ids({"workflow"}),
        },
    ]


def build_views(nodes, edges):
    node_by_id = {node["id"]: node for node in nodes}

    def collect_node_ids(edge_types, seed_kinds=()):
        result = []
        for node in nodes:
            if node["kind"] in seed_kinds:
                result.append(node["id"])
        for edge in edges:
            if edge["type"] in edge_types:
                for endpoint in (edge["from"], edge["to"]):
                    if endpoint in node_by_id and endpoint not in result:
                        result.append(endpoint)
        return result

    posting_ids = [n["id"] for n in nodes if n["kind"] in ("operation", "records")]

    report_ids = [n["id"] for n in nodes if n["kind"] == "data_view"]
    for edge in edges:
        if edge["type"] == "reads" and edge["to"] in report_ids and edge["from"] not in report_ids:
            if edge["from"] not in report_ids:
                report_ids.append(edge["from"])

    workflow_ids = [n["id"] for n in nodes if n["kind"] == "workflow"]
    for edge in edges:
        if edge["type"] in ("fills", "calculates") or (
                edge["type"] == "reads" and edge["to"] in workflow_ids):
            for endpoint in (edge["from"], edge["to"]):
                if endpoint in node_by_id and endpoint not in workflow_ids:
                    workflow_ids.append(endpoint)

    all_groups = ["GROUP-fact-documents", "GROUP-fact-storage", "GROUP-fact-inputs",
                  "GROUP-fact-reports", "GROUP-fact-workflows"]

    return [
        {
            "id": "VIEW-fact-main",
            "title": "Общая карта (факт)",
            "description": "Все фактические метаобъекты и основные связи: проведение, чтение, расчёты и заполнение (FK-ссылки вынесены в отдельный вид).",
            "includedGroups": all_groups,
            "includedEdgeTypes": ["writes", "reads", "calculates", "fills"],
        },
        {
            "id": "VIEW-fact-posting",
            "title": "Проведение документов",
            "description": "Какие операции какие регистры записей пишут (recordsSettings, направления приход/расход).",
            "includedNodeIds": posting_ids,
            "includedEdgeTypes": ["writes"],
        },
        {
            "id": "VIEW-fact-reports",
            "title": "Отчёты и их данные",
            "description": "Откуда фактические отчёты берут данные (по from(...) в скриптах data source).",
            "includedNodeIds": report_ids,
            "includedEdgeTypes": ["reads"],
        },
        {
            "id": "VIEW-fact-workflows",
            "title": "Workflow и заполнение",
            "description": "Что читают workflow-процессы, какие объекты они заполняют и какие команды их запускают.",
            "includedNodeIds": workflow_ids,
            "includedEdgeTypes": ["fills", "calculates", "reads"],
        },
        {
            "id": "VIEW-fact-references",
            "title": "Ссылки на справочники (FK)",
            "description": "Ссылочные колонки по dataTypes: какие объекты на какие справочники, перечисления и документы ссылаются.",
            "includedGroups": all_groups,
            "includedEdgeTypes": ["references"],
        },
    ]


def build_fact_dataset(metadata_dir):
    objects, uid_index, dtype_index, warnings = scan_metadata(metadata_dir)
    edges = collect_edges(objects, uid_index, dtype_index, warnings)
    nodes = build_nodes(objects)

    counts_by_kind = OrderedDict()
    for node in nodes:
        counts_by_kind[node["kind"]] = counts_by_kind.get(node["kind"], 0) + 1

    manifest_exported = None
    manifest_path = metadata_dir / "manifest.json"
    if manifest_path.is_file():
        manifest_exported = load_json(manifest_path).get("exportedAtUtc")

    dataset = OrderedDict()
    dataset["schemaVersion"] = "architecture-view-json-v0.1"
    dataset["meta"] = OrderedDict([
        ("id", "sp-001-bakery-stage1b-metadata-view"),
        ("title", "Хлебозавод — as-built карта по metadata/ (факт)"),
        ("status", "generated"),
        ("version", 1),
        ("sourceMetadata", "metadata/"),
        ("sourceManifestExportedAtUtc", manifest_exported),
        ("generator", "project/tools/build_arch_view.py"),
    ])
    dataset["summary"] = OrderedDict([
        ("goal", "Показать фактические метаобъекты стенда (этапы 1a+1b) и связи между ними, восстановленные из metadata/."),
        ("businessResult", "Карта as-built: операции проводятся по регистрам записей согласно recordsSettings, отчёты читают регистры через скрипты data source, workflow рассчитывают потребность и заполняют тестовые данные, документы и регистры ссылаются на справочники по FK."),
        ("createdObjectsCount", len(nodes)),
        ("reusedObjectsCount", 0),
        ("createdObjects", [node["name"] for node in nodes]),
        ("reusedObjects", []),
        ("countsByKind", counts_by_kind),
    ])
    dataset["groups"] = build_groups(nodes)
    dataset["nodes"] = nodes
    dataset["edges"] = edges
    dataset["views"] = build_views(nodes, edges)
    dataset["legend"] = OrderedDict([
        ("lifecycle", OrderedDict([
            ("as-built", "Фактически существует в metadata/ (выгрузка стенда)"),
        ])),
        ("edgeTypes", OrderedDict([
            ("writes", "Операция пишет движения в регистр записей (recordsSettings)"),
            ("reads", "Объект читает данные (from(...) в .bjs скрипте)"),
            ("calculates", "Workflow запускается командой операции (runWorkflow)"),
            ("fills", "Workflow создаёт/обновляет объекты (data_object_loader)"),
            ("references", "Ссылочная колонка (FK по dataTypes)"),
        ])),
    ])
    return dataset, warnings


# --------------------------------------------------------------------------
# HTML generation
# --------------------------------------------------------------------------

HTML_TEMPLATE = """<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Хлебозавод — карта архитектуры для PM</title>
  <script src="https://cdn.jsdelivr.net/npm/cytoscape@3.34.0/dist/cytoscape.min.js"></script>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f1ea;
      --panel: #fffaf2;
      --panel-2: #ffffff;
      --ink: #1e293b;
      --muted: #64748b;
      --line: #ded7ca;
      --accent: #b45309;
      --accent-2: #0f766e;
      --blue: #2563eb;
      --green: #15803d;
      --purple: #7c3aed;
      --shadow: 0 18px 55px rgba(30, 41, 59, 0.14);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(180, 83, 9, 0.16), transparent 30rem),
        radial-gradient(circle at bottom right, rgba(15, 118, 110, 0.14), transparent 28rem),
        var(--bg);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .shell {
      display: grid;
      grid-template-rows: auto 1fr;
      min-height: 100vh;
    }

    header {
      padding: 18px 22px 14px;
      border-bottom: 1px solid rgba(100, 116, 139, 0.22);
      background: rgba(255, 250, 242, 0.84);
      backdrop-filter: blur(12px);
    }

    .topline {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: start;
    }

    h1 {
      margin: 0 0 7px;
      font-size: clamp(22px, 2.7vw, 34px);
      letter-spacing: -0.035em;
      line-height: 1.05;
    }

    .source {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
    }

    .tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .tab-button {
      padding: 11px 18px;
      border-radius: 14px;
      border: 1px solid rgba(100, 116, 139, 0.25);
      background: rgba(255, 255, 255, 0.72);
      color: var(--ink);
      font-weight: 750;
      font-size: 14px;
      transition: 120ms ease;
    }

    .tab-button:hover {
      transform: translateY(-1px);
      border-color: rgba(180, 83, 9, 0.45);
    }

    .tab-button.active {
      color: #fff;
      background: linear-gradient(135deg, #b45309, #0f766e);
      border-color: transparent;
      box-shadow: 0 12px 26px rgba(180, 83, 9, 0.22);
    }

    .summary {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(4, minmax(110px, auto));
      gap: 10px;
      justify-content: start;
    }

    .metric {
      padding: 8px 12px;
      border: 1px solid rgba(100, 116, 139, 0.2);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.68);
      box-shadow: 0 8px 24px rgba(30, 41, 59, 0.06);
    }

    .metric strong {
      display: block;
      font-size: 20px;
      line-height: 1;
    }

    .metric span {
      color: var(--muted);
      font-size: 12px;
    }

    .layout {
      display: grid;
      grid-template-columns: 300px minmax(0, 1fr) 340px;
      gap: 16px;
      padding: 16px;
      min-height: 0;
    }

    .panel {
      min-height: 0;
      border: 1px solid rgba(100, 116, 139, 0.2);
      border-radius: 22px;
      background: rgba(255, 250, 242, 0.88);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .left, .right {
      display: flex;
      flex-direction: column;
    }

    .panel-section {
      padding: 16px;
      border-bottom: 1px solid rgba(100, 116, 139, 0.16);
    }

    .panel-section:last-child { border-bottom: 0; }

    .label {
      margin: 0 0 9px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .goal {
      margin: 0;
      font-size: 14px;
      line-height: 1.46;
    }

    .views {
      display: grid;
      gap: 8px;
    }

    button, input {
      font: inherit;
    }

    button {
      border: 0;
      cursor: pointer;
    }

    .view-button, .tool-button {
      width: 100%;
      padding: 10px 11px;
      border-radius: 14px;
      color: var(--ink);
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(100, 116, 139, 0.2);
      text-align: left;
      transition: 120ms ease;
    }

    .view-button:hover, .tool-button:hover {
      transform: translateY(-1px);
      border-color: rgba(180, 83, 9, 0.45);
    }

    .view-button.active {
      color: #fff;
      background: linear-gradient(135deg, #b45309, #0f766e);
      border-color: transparent;
      box-shadow: 0 12px 26px rgba(180, 83, 9, 0.22);
    }

    .view-title {
      display: block;
      font-weight: 750;
      line-height: 1.2;
    }

    .view-description {
      display: block;
      margin-top: 4px;
      color: currentColor;
      opacity: 0.74;
      font-size: 12px;
      line-height: 1.34;
    }

    .search {
      width: 100%;
      padding: 11px 12px;
      border-radius: 14px;
      border: 1px solid rgba(100, 116, 139, 0.24);
      background: rgba(255, 255, 255, 0.78);
      color: var(--ink);
      outline: none;
    }

    .search:focus {
      border-color: rgba(15, 118, 110, 0.55);
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
    }

    .tool-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .tool-button {
      text-align: center;
      font-size: 13px;
      font-weight: 650;
    }

    .legend {
      display: grid;
      gap: 10px;
    }

    .legend-item {
      display: grid;
      grid-template-columns: 26px 1fr;
      gap: 8px;
      align-items: center;
      color: var(--muted);
      font-size: 13px;
    }

    .swatch {
      width: 26px;
      height: 14px;
      border-radius: 999px;
      background: var(--ink);
    }

    .canvas-card {
      position: relative;
      min-height: 640px;
      overflow: hidden;
    }

    #cy {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(rgba(100, 116, 139, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(100, 116, 139, 0.08) 1px, transparent 1px),
        rgba(255, 255, 255, 0.58);
      background-size: 26px 26px;
    }

    .hint {
      position: absolute;
      left: 16px;
      bottom: 16px;
      max-width: 500px;
      padding: 9px 12px;
      color: var(--muted);
      background: rgba(255, 250, 242, 0.9);
      border: 1px solid rgba(100, 116, 139, 0.2);
      border-radius: 16px;
      font-size: 12px;
      box-shadow: 0 10px 28px rgba(30, 41, 59, 0.1);
      pointer-events: none;
    }

    .pipeline-note {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      z-index: 2;
      display: none;
      padding: 10px 13px;
      color: #475569;
      background: rgba(255, 250, 242, 0.91);
      border: 1px solid rgba(100, 116, 139, 0.2);
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.38;
      box-shadow: 0 10px 28px rgba(30, 41, 59, 0.1);
      pointer-events: none;
    }

    .details h2 {
      margin: 0 0 6px;
      font-size: 22px;
      letter-spacing: -0.02em;
    }

    .details .type {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.1);
      color: var(--accent-2);
      font-size: 12px;
      font-weight: 750;
    }

    .details p {
      margin: 12px 0 0;
      color: var(--muted);
      line-height: 1.48;
      font-size: 14px;
    }

    .kv {
      display: grid;
      gap: 9px;
      margin-top: 14px;
    }

    .kv-row {
      display: grid;
      grid-template-columns: 88px 1fr;
      gap: 8px;
      font-size: 13px;
    }

    .kv-row span:first-child {
      color: var(--muted);
    }

    .list {
      display: grid;
      gap: 7px;
      max-height: 260px;
      overflow: auto;
      padding-right: 4px;
    }

    .object-link {
      display: grid;
      grid-template-columns: 8px 1fr;
      gap: 8px;
      align-items: center;
      padding: 8px 9px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.66);
      border: 1px solid rgba(100, 116, 139, 0.14);
      color: var(--ink);
      text-align: left;
      font-size: 13px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
    }

    .object-link small {
      display: block;
      color: var(--muted);
      font-size: 11px;
    }

    @media (max-width: 1180px) {
      .layout { grid-template-columns: 280px minmax(0, 1fr); }
      .right { grid-column: 1 / -1; }
      .canvas-card { min-height: 620px; }
    }

    @media (max-width: 760px) {
      .topline, .layout, .summary { grid-template-columns: 1fr; }
      .layout { padding: 10px; }
      .canvas-card { min-height: 560px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div class="topline">
        <div>
          <h1 id="pageTitle"></h1>
          <p class="source" id="sourceLine"></p>
        </div>
        <div class="tabs" id="tabs"></div>
      </div>
      <div class="summary" id="summary"></div>
    </header>
    <main class="layout">
      <aside class="panel left">
        <section class="panel-section">
          <p class="label">Цель</p>
          <p class="goal" id="goal"></p>
        </section>
        <section class="panel-section">
          <p class="label">PM-виды</p>
          <div class="views" id="views"></div>
        </section>
        <section class="panel-section">
          <p class="label">Поиск</p>
          <input class="search" id="search" placeholder="raw_movement, отчет, склад...">
        </section>
        <section class="panel-section">
          <p class="label">Действия</p>
          <div class="tool-grid">
            <button class="tool-button" id="fit">Показать всё</button>
            <button class="tool-button" id="labels">Скрыть подписи</button>
            <button class="tool-button" id="reset">Сброс</button>
            <button class="tool-button" id="png">PNG</button>
          </div>
        </section>
        <section class="panel-section">
          <p class="label">Легенда</p>
          <div class="legend" id="legend"></div>
        </section>
      </aside>

      <section class="panel canvas-card">
        <div id="cy"></div>
        <div class="pipeline-note" id="pipelineNote"></div>
        <div class="hint">Клик по объекту или связи открывает пояснение справа. Колёсико масштабирует, карту можно перетаскивать.</div>
      </section>

      <aside class="panel right">
        <section class="panel-section details" id="details"></section>
        <section class="panel-section">
          <p class="label">Объекты</p>
          <div class="list" id="objects"></div>
        </section>
      </aside>
    </main>
  </div>

  <script>
    const DATASETS = {
      design: {
        label: 'Дизайн',
        source: 'project/docs/specs/sp-001-bakery-stage1b.architecture-view.json',
        data: __DESIGN_DATASET__
      },
      metadata: {
        label: 'Metadata (факт)',
        source: 'metadata/ → project/docs/specs/sp-001-bakery-stage1b.metadata-view.json',
        data: __FACT_DATASET__
      }
    };

    const LEGEND = {
      design: [
        { color: '#b45309', label: 'документы пользователя' },
        { color: '#0f766e', label: 'регистры хранения результата' },
        { color: '#2563eb', label: 'отчеты для контроля' },
        { color: '#7c3aed', label: 'существующие объекты' }
      ],
      metadata: [
        { color: '#b45309', label: 'операции (документы)' },
        { color: '#0f766e', label: 'регистры записей (движения)' },
        { color: '#2563eb', label: 'отчёты (data view)' },
        { color: '#7c3aed', label: 'справочники, перечисления, регистры настроек' },
        { color: '#9333ea', label: 'workflow-процессы' }
      ]
    };

    const PIPELINE_NOTES = {
      design: 'Последовательность: сначала пользователь оформляет поступление сырья, при необходимости корректирует остатки инвентаризацией, затем выбирает производственное задание и оформляет выпуск.'
    };

    const nodeColors = {
      document: '#b45309',
      'existing-document': '#7c3aed',
      storage: '#0f766e',
      'existing-storage': '#7c3aed',
      report: '#2563eb',
      'existing-reference': '#7c3aed',
      reference: '#7c3aed',
      calculation: '#9333ea',
      future: '#64748b'
    };

    const edgeColors = {
      writes: '#b45309',
      reads: '#2563eb',
      'user-sequence': '#16a34a',
      fills: '#15803d',
      calculates: '#9333ea',
      references: '#94a3b8'
    };

    const viewButtons = document.getElementById('views');
    const details = document.getElementById('details');
    const objectList = document.getElementById('objects');
    const search = document.getElementById('search');
    const pipelineNote = document.getElementById('pipelineNote');
    let activeKey = 'design';
    let VIEW_DATA = DATASETS[activeKey].data;
    let currentView = VIEW_DATA.views && VIEW_DATA.views.length > 0 ? VIEW_DATA.views[0] : null;
    let labelsVisible = true;
    let cy;

    function nodesForView(view) {
      if (Array.isArray(view.includedNodeIds) && view.includedNodeIds.length > 0) {
        const include = new Set(view.includedNodeIds);
        return VIEW_DATA.nodes.filter((node) => include.has(node.id));
      }
      if (Array.isArray(view.includedGroups) && view.includedGroups.length > 0) {
        const groupIds = new Set(view.includedGroups);
        const nodeIds = new Set();
        VIEW_DATA.groups
          .filter((group) => groupIds.has(group.id))
          .forEach((group) => {
            (group.nodeIds || []).forEach((nodeId) => nodeIds.add(nodeId));
          });
        return VIEW_DATA.nodes.filter((node) => nodeIds.has(node.id));
      }
      return VIEW_DATA.nodes;
    }

    function edgesForView(view, nodeIds) {
      const edgeTypes = Array.isArray(view.includedEdgeTypes) && view.includedEdgeTypes.length > 0
        ? new Set(view.includedEdgeTypes)
        : undefined;
      return VIEW_DATA.edges.filter((edge) => {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) return false;
        if (edgeTypes && !edgeTypes.has(edge.type)) return false;
        return true;
      });
    }

    function groupByNodeId() {
      const map = new Map();
      for (const group of VIEW_DATA.groups || []) {
        for (const nodeId of group.nodeIds || []) map.set(nodeId, group.id);
      }
      return map;
    }

    function viewGroups(view, nodes) {
      if (Array.isArray(view.includedGroups) && view.includedGroups.length > 0) {
        const groupIds = new Set(view.includedGroups);
        return VIEW_DATA.groups.filter((group) => groupIds.has(group.id));
      }
      const nodeIds = new Set(nodes.map((node) => node.id));
      return VIEW_DATA.groups.filter((group) => (group.nodeIds || []).some((nodeId) => nodeIds.has(nodeId)));
    }

    function laneForNode(node, groupId) {
      if (node.visualType === 'report' || node.kind === 'data_view') return 'reports';
      if (node.visualType === 'calculation' || node.visualType === 'future' || node.kind === 'workflow') return 'existing';
      if (node.visualType === 'storage' || node.visualType === 'existing-storage' || node.kind === 'records') return 'storage';
      if (node.kind === 'catalog' || node.kind === 'enum' || node.kind === 'register') return 'existing';
      if (groupId && groupId.includes('existing')) return 'existing';
      return 'documents';
    }

    function positionNodes(nodes, groups) {
      if (currentView && currentView.layout === 'pipeline') {
        const positions = new Map();
        nodes.forEach((node, index) => {
          positions.set(node.id, { x: 180 + index * 270, y: index === 2 ? 180 : 320 });
        });
        return positions;
      }

      const groupsByNode = groupByNodeId();
      const lanes = { existing: [], documents: [], storage: [], reports: [] };
      for (const node of nodes) lanes[laneForNode(node, groupsByNode.get(node.id))].push(node);

      const positions = new Map();
      const placeVertical = (items, x, y, gap) => items.forEach((node, index) => positions.set(node.id, { x, y: y + index * gap }));
      const placeWrapped = (items, x, y, gapX, gapY, perRow) => items.forEach((node, index) => positions.set(node.id, {
        x: x + (index % perRow) * gapX,
        y: y + Math.floor(index / perRow) * gapY
      }));

      const topRows = Math.max(1, Math.ceil(lanes.existing.length / 5));
      const baseY = 110 + (topRows - 1) * 110 + 200;

      placeWrapped(lanes.existing, 230, 110, 260, 110, 5);
      placeVertical(lanes.documents, 190, baseY, 150);
      placeVertical(lanes.storage, 560, baseY - 20, 142);
      placeVertical(lanes.reports, 930, baseY + 20, 150);

      let fallback = 0;
      for (const node of nodes) {
        if (!positions.has(node.id)) {
          positions.set(node.id, { x: 260 + (fallback % 3) * 280, y: 220 + Math.floor(fallback / 3) * 150 });
          fallback += 1;
        }
      }
      return positions;
    }

    function buildElements(view) {
      const nodes = nodesForView(view);
      const nodeIds = new Set(nodes.map((node) => node.id));
      const edges = edgesForView(view, nodeIds);
      const groups = viewGroups(view, nodes);
      const groupsByNode = groupByNodeId();
      const positions = positionNodes(nodes, groups);
      const elements = [];

      for (const group of groups) {
        elements.push({
          data: { id: group.id, label: group.title, description: group.description || '', kind: 'group' },
          classes: 'group'
        });
      }

      for (const node of nodes) {
        const groupId = groupsByNode.get(node.id);
        const data = Object.assign({}, node, {
          label: node.title + '\\n' + node.name,
          color: nodeColors[node.visualType] || '#334155',
          parent: groups.some((group) => group.id === groupId) ? groupId : undefined
        });
        elements.push({ data, position: positions.get(node.id), classes: node.visualType || 'node' });
      }

      for (const edge of edges) {
        elements.push({
          data: Object.assign({}, edge, {
            source: edge.from,
            target: edge.to,
            label: edge.title || edge.type,
            color: edgeColors[edge.type] || '#64748b'
          }),
          classes: edge.type || 'edge'
        });
      }
      return { elements, nodes, edges };
    }

    function renderTabs() {
      const tabs = document.getElementById('tabs');
      tabs.innerHTML = '';
      for (const key of Object.keys(DATASETS)) {
        const button = document.createElement('button');
        button.className = 'tab-button' + (key === activeKey ? ' active' : '');
        button.textContent = DATASETS[key].label;
        button.addEventListener('click', () => selectDataset(key));
        tabs.appendChild(button);
      }
    }

    function renderSummary() {
      const box = document.getElementById('summary');
      box.innerHTML = '';
      const s = VIEW_DATA.summary || {};
      const items = [];
      if (activeKey === 'design') {
        if (typeof s.createdObjectsCount === 'number') items.push([s.createdObjectsCount, 'создаём']);
        if (typeof s.reusedObjectsCount === 'number') items.push([s.reusedObjectsCount, 'используем']);
      } else if (typeof s.createdObjectsCount === 'number') {
        items.push([s.createdObjectsCount, 'метаобъектов']);
      }
      items.push([(VIEW_DATA.nodes || []).length, 'объектов на карте']);
      items.push([(VIEW_DATA.edges || []).length, 'связей']);
      for (const [value, label] of items) {
        const metric = document.createElement('div');
        metric.className = 'metric';
        const strong = document.createElement('strong');
        strong.textContent = String(value);
        const span = document.createElement('span');
        span.textContent = label;
        metric.append(strong, span);
        box.appendChild(metric);
      }
    }

    function renderLegend() {
      const box = document.getElementById('legend');
      box.innerHTML = '';
      for (const item of LEGEND[activeKey] || []) {
        const div = document.createElement('div');
        div.className = 'legend-item';
        const swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.background = item.color;
        const label = document.createElement('span');
        label.textContent = item.label;
        div.append(swatch, label);
        box.appendChild(div);
      }
    }

    function renderViews() {
      viewButtons.innerHTML = '';
      for (const view of VIEW_DATA.views || []) {
        const button = document.createElement('button');
        button.className = 'view-button' + (currentView && view.id === currentView.id ? ' active' : '');
        button.innerHTML = '<span class="view-title"></span><span class="view-description"></span>';
        button.querySelector('.view-title').textContent = view.title;
        button.querySelector('.view-description').textContent = view.description || '';
        button.addEventListener('click', () => loadView(view.id));
        viewButtons.appendChild(button);
      }
    }

    function renderObjectList(nodes) {
      objectList.innerHTML = '';
      for (const node of nodes) {
        const button = document.createElement('button');
        button.className = 'object-link';
        button.innerHTML = '<span class="dot"></span><span></span>';
        button.querySelector('.dot').style.background = nodeColors[node.visualType] || '#334155';
        button.querySelector('span:last-child').innerHTML = '<strong></strong><small></small>';
        button.querySelector('strong').textContent = node.title;
        button.querySelector('small').textContent = node.kind + '/' + node.name;
        button.addEventListener('click', () => {
          const ele = cy.getElementById(node.id);
          if (ele.nonempty()) {
            cy.animate({ center: { eles: ele }, zoom: 1.25 }, { duration: 220 });
            selectElement(ele);
          }
        });
        objectList.appendChild(button);
      }
    }

    function selectElement(ele) {
      cy.elements().removeClass('selected dim-neighborhood');
      ele.addClass('selected');

      if (ele.isNode()) {
        const d = ele.data();
        ele.connectedEdges().addClass('selected');
        // exclude compound group parents from dimming: in cytoscape a parent's
        // `opacity` multiplies into all descendants and would wash out the
        // labels of the selected node and its neighbours.
        cy.elements().not(ele.closedNeighborhood()).not(':parent').addClass('dim-neighborhood');
        details.innerHTML = '<span class="type"></span><h2></h2><p></p><div class="kv"></div>';
        details.querySelector('.type').textContent = d.kind === 'group' ? 'группа' : d.kind + ' / ' + (d.lifecycle || '');
        details.querySelector('h2').textContent = d.kind === 'group' ? d.label : d.title;
        details.querySelector('p').textContent = d.pmDescription || d.description || 'Описание не задано.';
        const kv = details.querySelector('.kv');
        if (d.name) kv.append(row('Name', d.name));
        if (d.visualType) kv.append(row('Тип', d.visualType));
        if (d.lifecycle) kv.append(row('Статус', d.lifecycle));
      } else {
        const d = ele.data();
        ele.connectedNodes().addClass('selected');
        cy.elements().not(ele.union(ele.connectedNodes())).not(':parent').addClass('dim-neighborhood');
        const from = VIEW_DATA.nodes.find((node) => node.id === d.from);
        const to = VIEW_DATA.nodes.find((node) => node.id === d.to);
        details.innerHTML = '<span class="type"></span><h2></h2><p></p><div class="kv"></div>';
        details.querySelector('.type').textContent = 'связь / ' + d.type;
        details.querySelector('h2').textContent = d.title || d.type;
        details.querySelector('p').textContent = d.pmDescription || 'Описание связи не задано.';
        const kv = details.querySelector('.kv');
        kv.append(row('Откуда', from ? from.title + ' (' + from.name + ')' : d.from));
        kv.append(row('Куда', to ? to.title + ' (' + to.name + ')' : d.to));
      }
    }

    function row(key, value) {
      const div = document.createElement('div');
      div.className = 'kv-row';
      const k = document.createElement('span');
      const v = document.createElement('span');
      k.textContent = key;
      v.textContent = value;
      div.append(k, v);
      return div;
    }

    function emptyDetails() {
      details.innerHTML = '<span class="type">карта архитектуры</span><h2>Выберите объект</h2><p></p>';
      details.querySelector('p').textContent = (VIEW_DATA.summary && VIEW_DATA.summary.businessResult) || 'Кликните по объекту или связи, чтобы увидеть пояснение для PM.';
    }

    function loadView(viewId) {
      currentView = (VIEW_DATA.views || []).find((view) => view.id === viewId) || (VIEW_DATA.views && VIEW_DATA.views.length > 0 ? VIEW_DATA.views[0] : null);
      if (!currentView) {
        details.innerHTML = '<span class="type">ошибка данных</span><h2>Нет PM-видов</h2><p>В датасете не найден массив views.</p>';
        return;
      }
      const built = buildElements(currentView);
      renderViews();
      renderObjectList(built.nodes);
      emptyDetails();
      if (pipelineNote) {
        const isPipeline = currentView.layout === 'pipeline';
        pipelineNote.style.display = isPipeline ? 'block' : 'none';
        pipelineNote.textContent = isPipeline ? (PIPELINE_NOTES[activeKey] || currentView.description || '') : '';
      }

      if (cy) cy.destroy();
      if (typeof cytoscape !== 'function') {
        details.innerHTML = '<span class="type">ошибка загрузки</span><h2>Cytoscape не загружен</h2><p>Проверьте интернет-доступ к cdn.jsdelivr.net или используйте локальную копию библиотеки.</p>';
        return;
      }
      cy = cytoscape({
        container: document.getElementById('cy'),
        elements: built.elements,
        layout: { name: 'preset', padding: 70, fit: true },
        minZoom: 0.35,
        maxZoom: 2.2,
        wheelSensitivity: 0.18,
        style: [
          {
            selector: 'node',
            style: {
              'shape': 'round-rectangle',
              'width': 184,
              'height': 66,
              'background-color': 'data(color)',
              'background-opacity': 0.96,
              'border-width': 2,
              'border-color': '#ffffff',
              'label': 'data(label)',
              'color': '#ffffff',
              'font-size': 13,
              'font-weight': 700,
              'text-wrap': 'wrap',
              'text-max-width': 154,
              'text-valign': 'center',
              'text-halign': 'center',
              'overlay-opacity': 0,
              'shadow-blur': 18,
              'shadow-color': '#0f172a',
              'shadow-opacity': 0.2,
              'shadow-offset-y': 8
            }
          },
          {
            selector: 'node[visualType *= "existing"]',
            style: {
              'background-opacity': 0.82,
              'border-style': 'dashed'
            }
          },
          {
            selector: '.group',
            style: {
              'shape': 'round-rectangle',
              'background-color': '#fff7ed',
              'background-opacity': 0.38,
              'border-color': '#d6c7b3',
              'border-width': 1.5,
              'border-style': 'solid',
              'label': 'data(label)',
              'color': '#475569',
              'font-size': 13,
              'font-weight': 800,
              'text-valign': 'top',
              'text-halign': 'center',
              'text-margin-y': -10,
              'padding': 28,
              'events': 'no',
              'shadow-opacity': 0
            }
          },
          {
            selector: 'edge',
            style: {
              'curve-style': 'bezier',
              'control-point-step-size': 42,
              'width': 2.5,
              'line-color': 'data(color)',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': 'data(color)',
              'arrow-scale': 1.1,
              'label': 'data(label)',
              'font-size': 11,
              'font-weight': 700,
              'color': '#334155',
              'text-background-color': '#fffaf2',
              'text-background-opacity': 0.86,
              'text-background-padding': 4,
              'text-border-color': '#e2e8f0',
              'text-border-width': 1,
              'text-border-opacity': 0.7
            }
          },
          { selector: '.reads', style: { 'line-style': 'dashed' } },
          { selector: '.references', style: { 'line-style': 'dotted', 'width': 1.6, 'arrow-scale': 0.9, 'font-size': 10 } },
          { selector: '.user-sequence', style: { 'line-style': 'solid', 'width': 4, 'arrow-scale': 1.35, 'font-size': 12, 'font-weight': 800 } },
          { selector: '.provides-input, .provides-rules', style: { 'line-color': '#64748b', 'target-arrow-color': '#64748b' } },
          { selector: 'node.selected', style: { 'border-width': 5, 'border-color': '#facc15', 'z-index': 20, 'text-opacity': 1, 'color': '#ffffff' } },
          { selector: 'edge.selected', style: { 'width': 4.5, 'z-index': 20, 'text-opacity': 1 } },
          // dimming uses per-channel opacities instead of blanket `opacity`,
          // so labels stay readable (~0.3) instead of fading to nothing
          { selector: 'node.dim-neighborhood', style: { 'background-opacity': 0.16, 'border-opacity': 0.2, 'text-opacity': 0.3 } },
          { selector: 'edge.dim-neighborhood', style: { 'opacity': 0.3, 'text-opacity': 1 } },
          { selector: 'node.search-dim', style: { 'background-opacity': 0.14, 'border-opacity': 0.2, 'text-opacity': 0.3 } },
          { selector: '.hide-labels', style: { 'label': '' } }
        ]
      });

      cy.on('tap', 'node, edge', (event) => selectElement(event.target));
      cy.on('tap', (event) => {
        if (event.target === cy) {
          cy.elements().removeClass('selected dim-neighborhood');
          emptyDetails();
        }
      });
      setTimeout(() => cy.fit(undefined, 64), 60);
      applySearch();
      applyLabelState();
    }

    function selectDataset(key) {
      activeKey = key;
      VIEW_DATA = DATASETS[key].data;
      currentView = VIEW_DATA.views && VIEW_DATA.views.length > 0 ? VIEW_DATA.views[0] : null;
      const title = (VIEW_DATA.meta && VIEW_DATA.meta.title) || 'Карта архитектуры';
      document.getElementById('pageTitle').textContent = title;
      document.title = title;
      document.getElementById('sourceLine').textContent = 'Источник: ' + DATASETS[key].source;
      document.getElementById('goal').textContent = (VIEW_DATA.summary && VIEW_DATA.summary.goal) || '';
      renderTabs();
      renderSummary();
      renderLegend();
      loadView(currentView && currentView.id);
    }

    function applySearch() {
      if (!cy) return;
      const query = search.value.trim().toLowerCase();
      cy.elements().removeClass('search-dim');
      if (!query) return;
      cy.nodes().forEach((node) => {
        const d = node.data();
        const haystack = [d.title, d.name, d.kind, d.pmDescription, d.label].join(' ').toLowerCase();
        if (d.kind !== 'group' && !haystack.includes(query)) node.addClass('search-dim');
      });
    }

    function applyLabelState() {
      if (!cy) return;
      cy.edges().toggleClass('hide-labels', !labelsVisible);
    }

    document.getElementById('fit').addEventListener('click', () => { if (cy) cy.fit(undefined, 64); });
    document.getElementById('reset').addEventListener('click', () => {
      search.value = '';
      if (cy) cy.elements().removeClass('selected dim-neighborhood search-dim');
      emptyDetails();
      if (cy) cy.fit(undefined, 64);
    });
    document.getElementById('labels').addEventListener('click', (event) => {
      labelsVisible = !labelsVisible;
      event.currentTarget.textContent = labelsVisible ? 'Скрыть подписи' : 'Показать подписи';
      applyLabelState();
    });
    document.getElementById('png').addEventListener('click', () => {
      const png = cy.png({ full: true, scale: 2, bg: '#fffaf2' });
      const link = document.createElement('a');
      link.download = ((VIEW_DATA.meta && VIEW_DATA.meta.id) || 'architecture-view') + '.png';
      link.href = png;
      link.click();
    });
    search.addEventListener('input', applySearch);

    try {
      selectDataset(activeKey);
    } catch (error) {
      details.innerHTML = '<span class="type">ошибка запуска</span><h2>Viewer не запустился</h2><p></p>';
      details.querySelector('p').textContent = error && error.message ? error.message : String(error);
      throw error;
    }
  </script>
</body>
</html>
"""


def render_html(design_dataset, fact_dataset):
    design_json = json.dumps(design_dataset, ensure_ascii=False, indent=2)
    fact_json = json.dumps(fact_dataset, ensure_ascii=False, indent=2)
    html = HTML_TEMPLATE.replace("__DESIGN_DATASET__", design_json)
    html = html.replace("__FACT_DATASET__", fact_json)
    return html


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Build the as-built architecture view dataset and the two-tab HTML viewer.")
    parser.add_argument("--metadata-dir", default="metadata",
                        help="BaSYS metadata directory (read-only input), default: metadata")
    parser.add_argument("--design-json",
                        default="project/docs/specs/sp-001-bakery-stage1b.architecture-view.json",
                        help="design dataset (read-only input)")
    parser.add_argument("--out-json",
                        default="project/docs/specs/sp-001-bakery-stage1b.metadata-view.json",
                        help="output: as-built dataset JSON")
    parser.add_argument("--out-html",
                        default="project/docs/specs/sp-001-bakery-stage1b.architecture-view.html",
                        help="output: two-tab HTML viewer")
    args = parser.parse_args(argv)

    metadata_dir = Path(args.metadata_dir)
    if not metadata_dir.is_dir():
        parser.error("metadata directory not found: {0} (run from the workspace root)".format(metadata_dir))
    design_path = Path(args.design_json)
    if not design_path.is_file():
        parser.error("design dataset not found: {0}".format(design_path))

    fact_dataset, warnings = build_fact_dataset(metadata_dir)
    design_dataset = load_json(design_path)

    out_json = Path(args.out_json)
    out_json.parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(fact_dataset, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    out_html = Path(args.out_html)
    out_html.parent.mkdir(parents=True, exist_ok=True)
    with open(out_html, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(render_html(design_dataset, fact_dataset))

    print("as-built dataset: {0} ({1} nodes, {2} edges)".format(
        out_json, len(fact_dataset["nodes"]), len(fact_dataset["edges"])))
    print("two-tab viewer:   {0}".format(out_html))
    for warning in warnings:
        print("WARNING: {0}".format(warning), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
