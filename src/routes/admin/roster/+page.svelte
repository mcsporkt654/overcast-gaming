<script>
  import { onMount } from 'svelte';
  import { normalizeGoogleDrivePhotoUrl, isGoogleDriveUrl } from '$lib/photoUrl.js';
  import { armyNames, loadArmies, loadPlayers, splitList } from '$lib/adminReference.js';

  const SOCIAL_FIELDS = [
    { key: 'instagram', label: 'Instagram', placeholder: 'username or URL' },
    { key: 'twitter', label: 'X / Twitter', placeholder: 'username or URL' },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
    { key: 'twitch', label: 'Twitch', placeholder: 'username or URL' },
    { key: 'tiktok', label: 'TikTok', placeholder: 'username or URL' },
    { key: 'discord', label: 'Discord', placeholder: 'username or server URL' },
    { key: 'reddit', label: 'Reddit', placeholder: 'u/username or URL' },
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' }
  ];

  /** @type {{ name: string, subfactions?: string[] }[]} */
  let armies = [];
  /** @type {{ id: string, name: string, photo?: string, armies?: string[] }[]} */
  let roster = [];
  let rosterLoading = true;

  let name = '';
  /** @type {string[]} */
  let selectedArmies = [];
  let customArmies = '';
  let photo = '';
  /** @type {Record<string, string>} */
  let socials = Object.fromEntries(SOCIAL_FIELDS.map((f) => [f.key, '']));

  let submitting = false;
  let alertKind = /** @type {'' | 'success' | 'error'} */ ('');
  let alertText = '';

  let showDriveHelp = false;
  /** @type {'idle' | 'loading' | 'ok' | 'error'} */
  let previewState = 'idle';

  $: availableArmies = armyNames(armies);
  $: previewUrl = normalizeGoogleDrivePhotoUrl(photo);
  $: driveConverted = isGoogleDriveUrl(photo) && previewUrl !== photo.trim();
  // Reset the load state whenever the resolved URL changes, so a new paste
  // doesn't inherit the previous URL's success/failure.
  $: previewState = previewUrl ? 'loading' : 'idle';

  async function refreshRoster() {
    rosterLoading = true;
    roster = await loadPlayers();
    rosterLoading = false;
  }

  onMount(async () => {
    armies = await loadArmies();
    await refreshRoster();
  });

  function resetForm() {
    name = '';
    selectedArmies = [];
    customArmies = '';
    photo = '';
    socials = Object.fromEntries(SOCIAL_FIELDS.map((f) => [f.key, '']));
  }

  async function submitPlayer() {
    if (submitting) return;
    submitting = true;
    alertKind = '';
    alertText = '';

    const mergedArmies = [...new Set([...selectedArmies, ...splitList(customArmies)])];
    /** @type {Record<string, string>} */
    const cleanSocials = {};
    for (const field of SOCIAL_FIELDS) {
      const value = socials[field.key]?.trim();
      if (value) cleanSocials[field.key] = value;
    }

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          armies: mergedArmies,
          photo: previewUrl,
          socials: cleanSocials
        })
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 401) {
        alertKind = 'error';
        alertText = 'Session expired. Reload the page and log in again.';
        return;
      }
      if (!res.ok || !body.success) throw new Error(body.error || 'Unknown error');

      alertKind = 'success';
      alertText = `✓ Added to the roster: ${body.player.name} (${body.player.armies.join(', ')})`;
      resetForm();
      await refreshRoster();
    } catch (err) {
      alertKind = 'error';
      alertText = '✗ Error: ' + (err instanceof Error ? err.message : String(err));
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Admin · Roster — Overcast Wargaming League</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="section">
  <div class="admin-grid">

    <!-- ── Add a player ─────────────────────────────────────────────── -->
    <div class="admin-form-card">
      <h3>➕ Add to the Roster</h3>

      {#if alertText}
        <div class="alert {alertKind}">{alertText}</div>
      {/if}

      <form on:submit|preventDefault={submitPlayer}>
        <div class="form-group">
          <label for="player-name">Player Name</label>
          <input type="text" id="player-name" placeholder="e.g. Inquisitor Mourne" bind:value={name} required />
        </div>

        <div class="form-group">
          <label for="player-armies">Armies (hold Ctrl/Cmd for multiple)</label>
          <select id="player-armies" multiple bind:value={selectedArmies}>
            {#each availableArmies as army}
              <option value={army}>{army}</option>
            {/each}
          </select>
          <p class="form-hint">Hold Ctrl (Windows) or Cmd (Mac) to select multiple factions.</p>
        </div>

        <div class="form-group">
          <label for="player-armies-custom">
            Additional Armies <span style="color:var(--text-muted)">(comma-separated, optional)</span>
          </label>
          <input type="text" id="player-armies-custom" placeholder="e.g. Harlequins, Votann" bind:value={customArmies} />
          <p class="form-hint">These will be merged with your selections above.</p>
        </div>

        <!-- ── Photo URL + live preview ───────────────────────────────── -->
        <div class="form-group">
          <label for="player-photo">
            Photo URL <span style="color:var(--text-muted)">(optional)</span>
            <button
              type="button"
              class="help-toggle"
              aria-expanded={showDriveHelp}
              aria-controls="drive-help"
              title="How do I host a photo on Google Drive?"
              on:click={() => (showDriveHelp = !showDriveHelp)}
            >?</button>
          </label>
          <input type="url" id="player-photo" placeholder="https://drive.google.com/file/d/..." bind:value={photo} />
          <p class="form-hint">Leave blank to use the default placeholder.</p>

          {#if showDriveHelp}
            <div class="help-bubble" id="drive-help" role="note">
              <strong>Using Google Drive to host a player photo</strong>
              <ol>
                <li>Upload the photo to Google Drive.</li>
                <li>Right-click it → <em>Share</em>.</li>
                <li>Under <em>General access</em>, switch <em>Restricted</em> to <strong>Anyone with the link</strong>, role <em>Viewer</em>.</li>
                <li>Click <em>Copy link</em> and paste it in the box above.</li>
              </ol>
              <p>
                A Drive share link points at a viewer page, not the image itself — it's pasted here as
                <code>…/file/d/FILE_ID/view</code> and rewritten to
                <code>drive.google.com/thumbnail?id=FILE_ID</code>, which browsers can render directly.
                The preview below is exactly what the public roster will show, so if it's blank the
                file probably isn't shared publicly yet.
              </p>
            </div>
          {/if}

          <div class="photo-preview">
            {#if !previewUrl}
              <div class="photo-preview-frame empty">No photo</div>
              <p class="form-hint">Paste a URL to preview the public photo.</p>
            {:else}
              {#key previewUrl}
                <div class="photo-preview-frame">
                  <img
                    src={previewUrl}
                    alt="Preview of the photo that will appear on the public roster"
                    referrerpolicy="no-referrer"
                    on:load={() => (previewState = 'ok')}
                    on:error={() => (previewState = 'error')}
                  />
                </div>
              {/key}
              <div class="photo-preview-meta">
                {#if previewState === 'error'}
                  <p class="form-hint preview-error">
                    ✗ That URL didn't load. Check that the file is shared with <strong>Anyone with the link</strong>.
                  </p>
                {:else if previewState === 'ok'}
                  <p class="form-hint preview-ok">✓ Loads publicly — this is what the roster will show.</p>
                {:else}
                  <p class="form-hint">Loading preview…</p>
                {/if}
                {#if driveConverted}
                  <p class="form-hint">Google Drive link detected — saving as <code>{previewUrl}</code></p>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- ── Socials ────────────────────────────────────────────────── -->
        <div class="form-group">
          <label for="social-instagram" style="color:var(--accent); font-size:0.7rem; letter-spacing:0.12em; text-transform:uppercase;">
            Social Links <span style="color:var(--text-muted); font-weight:400;">(optional)</span>
          </label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-top:0.4rem;">
            {#each SOCIAL_FIELDS as field}
              <div>
                <label for={'social-' + field.key} style="font-size:0.72rem; color:var(--text-muted);">{field.label}</label>
                <input
                  type="text"
                  id={'social-' + field.key}
                  placeholder={field.placeholder}
                  bind:value={socials[field.key]}
                />
              </div>
            {/each}
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%; margin-top:0.5rem" disabled={submitting}>
          {submitting ? 'Adding...' : '➕ Add to Roster'}
        </button>
      </form>
    </div>

    <!-- ── Current roster ───────────────────────────────────────────── -->
    <div class="admin-form-card">
      <h3>☠ Current Roster</h3>
      {#if rosterLoading}
        <div class="loader">Summoning warriors...</div>
      {:else if !roster.length}
        <p class="form-hint">
          The roster is empty. Everyone you add on the left shows up here and on the
          public <a href="/roster">Roster</a> page.
        </p>
      {:else}
        <p class="form-hint" style="margin-bottom:1rem;">{roster.length} commander{roster.length === 1 ? '' : 's'} on the roster.</p>
        <ul class="roster-list">
          {#each roster as player (player.id)}
            <li>
              {#if player.photo}
                <img class="roster-list-photo" src={player.photo} alt="" referrerpolicy="no-referrer" />
              {:else}
                <span class="roster-list-photo empty" aria-hidden="true">☠</span>
              {/if}
              <div>
                <strong>{player.name}</strong>
                <span class="roster-list-armies">{(player.armies ?? []).join(', ') || '—'}</span>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

  </div>
</section>

<style>
  .help-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.1rem;
    height: 1.1rem;
    margin-left: 0.35rem;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: transparent;
    color: var(--accent);
    font-size: 0.7rem;
    line-height: 1;
    cursor: pointer;
    vertical-align: middle;
  }

  .help-toggle:hover,
  .help-toggle[aria-expanded='true'] {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.12);
  }

  .help-bubble {
    position: relative;
    margin-top: 0.6rem;
    padding: 0.9rem 1rem;
    background: var(--bg-dark);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius);
    font-size: 0.78rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .help-bubble strong { color: var(--text-primary); }

  .help-bubble ol {
    margin: 0.5rem 0 0.75rem 1.1rem;
    padding: 0;
  }

  .help-bubble li { margin-bottom: 0.25rem; }

  .help-bubble code {
    font-size: 0.72rem;
    color: var(--accent);
    word-break: break-all;
  }

  .photo-preview {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    margin-top: 0.75rem;
  }

  .photo-preview-frame {
    flex: 0 0 auto;
    width: 96px;
    height: 96px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-dark);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .photo-preview-frame.empty {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .photo-preview-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .photo-preview-meta { min-width: 0; }
  .photo-preview .form-hint { margin-top: 0; }
  .preview-ok { color: var(--accent); }
  .preview-error { color: var(--loss); }

  .photo-preview code {
    font-size: 0.7rem;
    color: var(--accent);
    word-break: break-all;
  }

  .roster-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .roster-list li {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.65rem 0;
    border-bottom: 1px solid var(--border);
  }

  .roster-list li:last-child { border-bottom: none; }

  .roster-list-photo {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--border);
    background: var(--bg-dark);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .roster-list strong {
    display: block;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .roster-list-armies {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
</style>
