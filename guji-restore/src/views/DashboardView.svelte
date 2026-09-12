<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import { currentFolioId, currentProjectId, currentView, projects } from '../lib/stores';
  import { guard } from '../lib/toast';
  import {
    STAGE_META,
    STAGE_ORDER,
    type DashboardReport,
    type FolioStage,
    type RiskLevel
  } from '@shared/dashboard';

  let report: DashboardReport | null = null;
  let loading = false;
  let pid: string | null = null;

  currentProjectId.subscribe((v) => {
    pid = v;
    report = null;
    if (v) load(v);
  });
  onMount(() => {
    if (pid) load(pid);
  });

  async function load(id: string) {
    loading = true;
    const r = await guard(api.dashboard.get(id), '看板加载失败');
    loading = false;
    if (r && id === pid) report = r;
  }

  $: project = $projects.find((p) => p.id === pid) ?? null;

  /** 跳到对应叶的标注页 */
  function goFolio(folioId: string | null) {
    if (!folioId) return;
    currentFolioId.set(folioId);
    currentView.set('annotate');
  }

  const STAGE_COLORS: Record<FolioStage, string> = {
    imported: '#8a7d6b',
    annotated: '#1971c2',
    planned: '#0c8599',
    treated: '#e8890c',
    compared: '#2b8a3e'
  };

  const LEVEL_META: Record<RiskLevel, { label: string; color: string }> = {
    high: { label: '高风险', color: '#c92a2a' },
    medium: { label: '关注', color: '#e8890c' },
    low: { label: '提示', color: '#8a7d6b' }
  };

  const stagePct = (stage: FolioStage) => Math.round((STAGE_ORDER.indexOf(stage) / (STAGE_ORDER.length - 1)) * 100);
</script>

<div class="dash-wrap">
  <div class="view-head">
    <h2>项目进度与风险看板</h2>
    {#if project}<span class="muted">「{project.name}」 · {project.shelf_no || '无馆藏号'}</span>{/if}
    <div class="spacer"></div>
    {#if report}<span class="muted">生成于 {report.generated_at.slice(0, 19).replace('T', ' ')}</span>{/if}
    <button class="btn tiny secondary" on:click={() => pid && load(pid)} disabled={loading}>
      {loading ? '统计中…' : '刷新'}
    </button>
  </div>

  {#if !report}
    <div class="empty">{loading ? '正在汇总项目数据…' : '暂无数据'}</div>
  {:else}
    <div class="metrics card">
      <div class="completion">
        <b>{report.completion}%</b>
        <span>总体进度</span>
        <div class="bar"><i style={`width:${report.completion}%`}></i></div>
      </div>
      <div><b>{report.totals.folios}</b><span>扫描叶</span></div>
      <div><b>{report.totals.damageShapes}</b><span>破损标注</span></div>
      <div><b>{report.totals.repairShapes}</b><span>修补方案</span></div>
      <div><b>{report.totals.steps}</b><span>工序记录</span></div>
      <div class:warn={report.totals.unresolvedComments > 0}>
        <b>{report.totals.unresolvedComments}</b><span>未解决批注</span>
      </div>
      <div><b>{report.totals.afterImages}</b><span>修复后图</span></div>
    </div>

    <div class="grid">
      <section class="card">
        <h3>修复流水线（按叶统计到达阶段）</h3>
        <div class="funnel">
          {#each STAGE_ORDER as stage}
            {@const n = report.stageReached[stage]}
            {@const pct = report.totals.folios ? Math.round((n / report.totals.folios) * 100) : 0}
            <div class="stage">
              <div class="stage-head">
                <span class="tag" style={`background:${STAGE_COLORS[stage]}`}>{STAGE_META[stage].label}</span>
                <b>{n}</b><span class="muted">/ {report.totals.folios} 叶</span>
              </div>
              <div class="bar"><i style={`width:${pct}%;background:${STAGE_COLORS[stage]}`}></i></div>
              <div class="muted hint">{STAGE_META[stage].hint}</div>
            </div>
          {/each}
        </div>

        <h3 style="margin-top:18px">分叶进度</h3>
        {#if report.folios.length === 0}
          <div class="empty">尚未导入扫描叶。</div>
        {:else}
          <table>
            <thead>
              <tr><th>叶</th><th>阶段</th><th>破损</th><th>方案</th><th>工序</th><th>对照图</th><th style="width:30%">进度</th></tr>
            </thead>
            <tbody>
              {#each report.folios as f}
                <tr class="folio-row">
                  <td class="fname">
                    <button class="link" on:click={() => goFolio(f.folio_id)} title="前往标注页">{f.name}</button>
                  </td>
                  <td><span class="tag" style={`background:${STAGE_COLORS[f.stage]}`}>{STAGE_META[f.stage].label}</span></td>
                  <td>{f.damageCount || '—'}</td>
                  <td>{f.repairCount || '—'}</td>
                  <td>{f.stepCount || '—'}</td>
                  <td>{f.hasAfter ? '✓' : '—'}</td>
                  <td><div class="bar slim"><i style={`width:${stagePct(f.stage)}%;background:${STAGE_COLORS[f.stage]}`}></i></div></td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </section>

      <section class="card">
        <h3>风险清单（{report.risks.length}）</h3>
        {#if report.risks.length === 0}
          <div class="empty">当前没有触发任何风险规则，继续保持留痕习惯。</div>
        {:else}
          <ul class="risks">
            {#each report.risks as r}
              <li>
                <span class="tag" style={`background:${LEVEL_META[r.level].color}`}>{LEVEL_META[r.level].label}</span>
                <div class="rbody">
                  <b>{r.title}</b>
                  <p>{r.detail}</p>
                </div>
                {#if r.folio_id}
                  <button class="btn tiny ghost" on:click={() => goFolio(r.folio_id)}>前往该叶</button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}

        {#if report.damageByKind.length}
          <h3 style="margin-top:16px">破损构成</h3>
          <ul class="kinds">
            {#each report.damageByKind as d}
              <li>
                <span>{d.label}</span>
                <div class="bar slim"><i style={`width:${Math.round((d.count / report.totals.damageShapes) * 100)}%`}></i></div>
                <b>{d.count}</b>
              </li>
            {/each}
          </ul>
          <p class="muted">破损面积合计约 {report.totals.damagedAreaPx.toLocaleString()} px²（按标注几何估算）。</p>
        {/if}

        {#if report.techniqueCounts.length}
          <h3 style="margin-top:16px">工艺分布</h3>
          <ul class="techs">
            {#each report.techniqueCounts as t}
              <li><span class="tag" style="background:var(--green)">{t.technique}</span><b>× {t.count}</b></li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .dash-wrap {
    overflow-y: auto;
    padding-bottom: 30px;
  }
  .view-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 22px 0;
  }
  .view-head h2 {
    font-size: 17px;
  }
  .spacer {
    flex: 1;
  }
  .muted {
    color: #8a7d6b;
    font-size: 12px;
  }
  .metrics {
    display: grid;
    grid-template-columns: 2fr repeat(6, 1fr);
    gap: 8px;
    margin: 14px 22px;
    padding: 14px 16px;
    text-align: center;
  }
  .metrics > div {
    background: #f5eddc;
    border-radius: 6px;
    padding: 10px 6px;
  }
  .metrics b {
    display: block;
    font-size: 18px;
  }
  .metrics span {
    font-size: 11px;
    color: #8a7d6b;
  }
  .metrics .warn b {
    color: #c92a2a;
  }
  .metrics .completion {
    text-align: left;
    padding: 10px 14px;
  }
  .metrics .completion b {
    font-size: 22px;
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(420px, 3fr) minmax(320px, 2fr);
    gap: 14px;
    padding: 0 22px;
    align-items: start;
  }
  section.card {
    padding: 16px 18px;
  }
  h3 {
    font-size: 13px;
    letter-spacing: 1px;
    color: #6f6150;
    margin-bottom: 10px;
  }
  .funnel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .stage-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .hint {
    margin-top: 2px;
  }
  .bar {
    height: 8px;
    background: #eee3cc;
    border-radius: 99px;
    overflow: hidden;
    margin-top: 6px;
  }
  .bar i {
    display: block;
    height: 100%;
    background: var(--accent);
    border-radius: 99px;
  }
  .bar.slim {
    height: 6px;
    margin-top: 0;
    min-width: 60px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    text-align: left;
    font-size: 11px;
    color: #8a7d6b;
    font-weight: 500;
    padding: 4px 8px 6px;
    border-bottom: 1px solid var(--line);
  }
  td {
    padding: 7px 8px;
    border-bottom: 1px solid #efe6d2;
  }
  .folio-row:hover td {
    background: #faf4e6;
  }
  .fname {
    font-weight: 500;
  }
  .fname .link {
    background: none;
    border: none;
    padding: 0;
    color: var(--blue);
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .risks {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .risks li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    background: #f8f2e4;
    border: 1px solid #eadfc6;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .risks li .btn {
    flex: none;
    margin-top: 1px;
  }
  .risks .tag {
    flex: none;
    margin-top: 2px;
  }
  .rbody {
    flex: 1;
  }
  .rbody b {
    font-size: 13px;
  }
  .rbody p {
    margin: 3px 0 0;
    font-size: 12px;
    color: #6f6150;
  }
  .kinds li {
    display: grid;
    grid-template-columns: 56px 1fr 30px;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    margin-bottom: 6px;
  }
  .kinds b {
    text-align: right;
    color: #6f6150;
  }
  .techs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .techs li {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
  }
  .techs b {
    color: #6f6150;
  }
</style>
