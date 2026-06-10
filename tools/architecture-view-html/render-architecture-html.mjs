#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function usage() {
  return `Usage: node tools/architecture-view-html/render-architecture-html.mjs <architecture-view.json> <output.html>

Renders a PM-oriented architecture view JSON into a standalone Cytoscape HTML viewer.
`;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeScriptJson(data) {
  return JSON.stringify(data, null, 2)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function renderHtml(data, sourceFile) {
  const title = data.meta?.title || 'Architecture View';
  const created = data.summary?.createdObjectsCount ?? 0;
  const reused = data.summary?.reusedObjectsCount ?? 0;
  const objectCount = data.nodes?.length ?? 0;
  const linkCount = data.edges?.length ?? 0;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(title)}</title>
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
          <h1>${htmlEscape(title)}</h1>
          <p class="source">Источник: ${htmlEscape(sourceFile.replaceAll('\\', '/'))}</p>
        </div>
      </div>
      <div class="summary">
        <div class="metric"><strong>${htmlEscape(created)}</strong><span>создаём</span></div>
        <div class="metric"><strong>${htmlEscape(reused)}</strong><span>используем</span></div>
        <div class="metric"><strong>${htmlEscape(objectCount)}</strong><span>объектов на карте</span></div>
        <div class="metric"><strong>${htmlEscape(linkCount)}</strong><span>связей</span></div>
      </div>
    </header>
    <main class="layout">
      <aside class="panel left">
        <section class="panel-section">
          <p class="label">Цель</p>
          <p class="goal">${htmlEscape(data.summary?.goal || '')}</p>
        </section>
        <section class="panel-section">
          <p class="label">PM-виды</p>
          <div class="views" id="views"></div>
        </section>
        <section class="panel-section">
          <p class="label">Поиск</p>
          <input class="search" id="search" placeholder="raw_stock, отчет, склад...">
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
          <div class="legend">
            <div class="legend-item"><span class="swatch" style="background:#b45309"></span><span>документы пользователя</span></div>
            <div class="legend-item"><span class="swatch" style="background:#0f766e"></span><span>регистры хранения результата</span></div>
            <div class="legend-item"><span class="swatch" style="background:#2563eb"></span><span>отчеты для контроля</span></div>
            <div class="legend-item"><span class="swatch" style="background:#7c3aed"></span><span>существующие объекты</span></div>
          </div>
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
    const VIEW_DATA = ${safeScriptJson(data)};

    const nodeColors = {
      document: '#b45309',
      'existing-document': '#7c3aed',
      storage: '#0f766e',
      'existing-storage': '#7c3aed',
      report: '#2563eb',
      'existing-reference': '#7c3aed'
    };

    const viewButtons = document.getElementById('views');
    const details = document.getElementById('details');
    const objectList = document.getElementById('objects');
    const search = document.getElementById('search');
    const pipelineNote = document.getElementById('pipelineNote');
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
      if (groupId && groupId.includes('existing')) return 'existing';
      if (node.visualType === 'report') return 'reports';
      if (node.visualType === 'storage' || node.visualType === 'existing-storage') return 'storage';
      if (node.visualType === 'existing-reference') return 'existing';
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
      const placeHorizontal = (items, x, y, gap) => items.forEach((node, index) => positions.set(node.id, { x: x + index * gap, y }));

      placeHorizontal(lanes.existing, 230, 120, 260);
      placeVertical(lanes.documents, 190, 310, 150);
      placeVertical(lanes.storage, 560, 290, 142);
      placeVertical(lanes.reports, 930, 330, 150);

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
            color: edge.type === 'writes' ? '#b45309' : edge.type === 'reads' ? '#2563eb' : edge.type === 'user-sequence' ? '#16a34a' : '#64748b'
          }),
          classes: edge.type || 'edge'
        });
      }
      return { elements, nodes, edges };
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
        cy.elements().not(ele.closedNeighborhood()).addClass('dim-neighborhood');
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
        details.innerHTML = '<span class="type">ошибка данных</span><h2>Нет PM-видов</h2><p>В architecture-view.json не найден массив views.</p>';
        return;
      }
      const built = buildElements(currentView);
      renderViews();
      renderObjectList(built.nodes);
      emptyDetails();
      if (pipelineNote) {
        pipelineNote.style.display = currentView.layout === 'pipeline' ? 'block' : 'none';
        pipelineNote.textContent = currentView.layout === 'pipeline'
          ? 'Последовательность: сначала пользователь оформляет поступление сырья, при необходимости корректирует остатки инвентаризацией, затем выбирает производственное задание и оформляет выпуск.'
          : '';
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
          { selector: '.user-sequence', style: { 'line-style': 'solid', 'width': 4, 'arrow-scale': 1.35, 'font-size': 12, 'font-weight': 800 } },
          { selector: '.provides-input, .provides-rules', style: { 'line-color': '#64748b', 'target-arrow-color': '#64748b' } },
          { selector: 'node.selected', style: { 'border-width': 5, 'border-color': '#facc15', 'z-index': 20 } },
          { selector: 'edge.selected', style: { 'width': 4.5, 'z-index': 20 } },
          { selector: '.dim-neighborhood', style: { 'opacity': 0.22 } },
          { selector: '.search-dim', style: { 'opacity': 0.16 } },
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
      loadView(currentView && currentView.id);
    } catch (error) {
      details.innerHTML = '<span class="type">ошибка запуска</span><h2>Viewer не запустился</h2><p></p>';
      details.querySelector('p').textContent = error && error.message ? error.message : String(error);
      throw error;
    }
  </script>
</body>
</html>
`;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    return 0;
  }

  if (args.length !== 2) {
    console.error(usage());
    return 2;
  }

  const inputFile = path.resolve(args[0]);
  const outputFile = path.resolve(args[1]);
  const data = readJson(inputFile);
  const html = renderHtml(data, path.relative(process.cwd(), inputFile));
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, html, 'utf8');
  console.log(`Rendered ${path.relative(process.cwd(), outputFile)}`);
  return 0;
}

process.exitCode = main();
