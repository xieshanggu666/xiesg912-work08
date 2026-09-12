<script lang="ts">
  import { api, mediaUrl } from '../lib/api';
  import { currentFolioId, currentProjectId, folios } from '../lib/stores';
  import { guard, toast } from '../lib/toast';

  let pid = '';
  currentProjectId.subscribe((v) => (pid = v));
  let fid: string | null = null;
  currentFolioId.subscribe((v) => (fid = v));

  $: withAfter = $folios.filter((f) => f.after_rel);
  $: folio =
    withAfter.find((f) => f.id === fid) ??
    withAfter[0] ??
    $folios.find((f) => f.id === fid) ??
    null;

  let slider = 50;
  let mode: 'side' | 'slide' = 'side';

  async function setAfter() {
    const files = await api.dialog.pickImages();
    if (!files.length || !folio) return;
    const r = await guard(api.folios.setAfterImage(folio.id, files[0].path), '导入失败');
    if (r) {
      folios.update((fs) => fs.map((f) => (f.id === r.id ? r : f)));
      toast('已设置修复后图像，原图未被改动');
    }
  }
</script>

<div class="view-head">
  <h2>修复前后对比</h2>
  <select class="folio-select" value={folio?.id ?? ''} on:change={(e) => currentFolioId.set(e.currentTarget.value)}>
    {#each $folios.filter((f) => f.after_rel) as f}
      <option value={f.id}>{f.name}</option>
    {/each}
  </select>
  <div class="spacer"></div>
  <div class="seg">
    <button class="btn tiny ghost" class:on={mode === 'side'} on:click={() => (mode = 'side')}>并排</button>
    <button class="btn tiny ghost" class:on={mode === 'slide'} on:click={() => (mode = 'slide')}>滑动叠加</button>
  </div>
  <button class="btn secondary" on:click={setAfter}>设置修复后图</button>
</div>

{#if !folio}
  <div class="empty">
    还没有任何叶次上传修复后图像。<br />在标注页为对应叶点“设置修复后图”，或在此页右上角上传。
  </div>
{:else if !folio.after_rel}
  <div class="empty">「{folio.name}」尚无修复后图像。</div>
{:else}
  <div class="stage {mode === 'side' ? 'side' : 'slide'}">
    <div class="pane before">
      <img src={mediaUrl(pid, folio.original_rel)} alt="修复前" class="zoom" />
      <span class="badge">修复前 · 只读原图（sha256 已存档）</span>
    </div>
    <div class="pane after" style={mode === 'slide' ? `clip-path: inset(0 0 0 ${slider}%)` : ''}>
      <img src={mediaUrl(pid, folio.after_rel)} alt="修复后" class="zoom" />
      <span class="badge ok">修复后</span>
    </div>
    {#if mode === 'slide'}
      <div class="divider" style={`left:${slider}%`}></div>
      <input class="slider" type="range" min="0" max="100" bind:value={slider} />
    {/if}
  </div>
{/if}

<style>
  .view-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 22px 0;
  }
  h2 {
    font-size: 17px;
  }
  .spacer {
    flex: 1;
  }
  .folio-select {
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 6px 8px;
    background: #fffdf8;
  }
  .seg {
    display: flex;
  }
  .seg button.on {
    background: #e4d4b4;
  }
  .stage {
    position: relative;
    margin: 14px 22px 22px;
    flex: 1;
    min-height: 0;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: #efe7d3;
    overflow: hidden;
    display: flex;
  }
  .stage.side {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
  }
  .pane {
    position: relative;
    overflow: hidden;
    display: flex;
    min-width: 0;
    min-height: 0;
  }
  .stage.slide .after {
    position: absolute;
    inset: 0;
  }
  .pane img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .pane img.zoom {
    image-rendering: auto;
  }
  .badge {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(43, 42, 39, 0.82);
    color: #f3ead9;
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 99px;
  }
  .badge.ok {
    background: rgba(43, 138, 62, 0.88);
  }
  .slider {
    position: absolute;
    left: 12%;
    right: 12%;
    bottom: 18px;
  }
  .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--accent);
    pointer-events: none;
  }
</style>
