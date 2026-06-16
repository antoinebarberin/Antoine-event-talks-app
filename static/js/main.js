// Application State
let allNotes = [];
let filteredNotes = [];
let currentCategory = 'all';
let searchQuery = '';
let lastFetchedTime = '';

// DOM Elements
const feedGrid = document.getElementById('feed-grid');
const searchInput = document.getElementById('search-input');
const btnRefresh = document.getElementById('btn-refresh');
const refreshSpinner = document.getElementById('refresh-spinner');
const refreshText = document.getElementById('refresh-text');
const syncTimeEl = document.getElementById('sync-time');
const filterButtons = document.querySelectorAll('.filter-btn');
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statIssues = document.getElementById('stat-issues');
const statOthers = document.getElementById('stat-others');

// Dialog Elements
const tweetDialog = document.getElementById('tweet-dialog');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountText = document.getElementById('char-count-text');
const progressRingCircle = document.querySelector('.progress-ring__circle');
const btnConfirmTweet = document.getElementById('btn-confirm-tweet');
const btnCopyTweet = document.getElementById('btn-copy-tweet');
const mainAppShell = document.getElementById('app-shell');

// Toast Notification
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');

// Initialize Progress Ring constants
const ringRadius = 8;
const ringCircumference = 2 * Math.PI * ringRadius;
if (progressRingCircle) {
  progressRingCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
  progressRingCircle.style.strokeDashoffset = ringCircumference;
}

// Toast helper
function showToast(message, duration = 3000) {
  toastMsg.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Fetch notes from Flask backend
async function fetchReleaseNotes(forceRefresh = false) {
  setLoadingState(true);
  try {
    const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch release notes');
    
    const result = await response.json();
    if (result.success) {
      allNotes = result.notes || [];
      lastFetchedTime = result.last_fetched;
      syncTimeEl.textContent = `Synced: ${lastFetchedTime}`;
      
      updateSidebarStats();
      applyFiltersAndSearch();
      
      if (forceRefresh) {
        showToast('Release notes successfully updated!');
      }
    } else {
      throw new Error('Backend failed to parse feed.');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast(`Error: ${error.message}`);
    // If we have cached data, keep rendering it, otherwise show empty
    if (allNotes.length === 0) {
      renderEmptyState("Failed to retrieve updates. Please try again.");
    }
  } finally {
    setLoadingState(false);
  }
}

// Set visual loading state
function setLoadingState(isLoading) {
  if (isLoading) {
    btnRefresh.disabled = true;
    refreshSpinner.style.display = 'inline-block';
    refreshText.textContent = 'Refreshing...';
    
    // Render loading shimmer cards
    feedGrid.innerHTML = `
      <div class="shimmer-card"></div>
      <div class="shimmer-card"></div>
      <div class="shimmer-card"></div>
    `;
  } else {
    btnRefresh.disabled = false;
    refreshSpinner.style.display = 'none';
    refreshText.textContent = 'Refresh';
  }
}

// Update sidebar filter badges and stat boxes
function updateSidebarStats() {
  const counts = {
    all: allNotes.length,
    feature: 0,
    change: 0,
    issue: 0,
    breaking: 0,
    announcement: 0
  };
  
  allNotes.forEach(note => {
    const type = note.type.toLowerCase();
    if (type in counts) {
      counts[type]++;
    }
  });

  // Update button badges
  filterButtons.forEach(btn => {
    const category = btn.getAttribute('data-category');
    const badge = btn.querySelector('.badge-count');
    if (badge && category in counts) {
      badge.textContent = counts[category];
    }
  });

  // Update summary stats panel
  statTotal.textContent = counts.all;
  statFeatures.textContent = counts.feature;
  statIssues.textContent = counts.issue;
  statOthers.textContent = counts.change + counts.breaking + counts.announcement;
}

// Apply Category Filter + Text Search
function applyFiltersAndSearch() {
  filteredNotes = allNotes.filter(note => {
    // 1. Category Filter
    const matchesCategory = currentCategory === 'all' || note.type.toLowerCase() === currentCategory;
    
    // 2. Search Text Filter
    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inDate = note.date.toLowerCase().includes(q);
      const inType = note.type.toLowerCase().includes(q);
      const inText = note.content_text.toLowerCase().includes(q);
      matchesSearch = inDate || inType || inText;
    }
    
    return matchesCategory && matchesSearch;
  });
  
  renderFeed();
}

// Highlight search query text inside elements
function highlightText(text, query) {
  if (!query) return text;
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark class="highlight">$1</mark>');
}

// Render the list of cards
function renderFeed() {
  if (filteredNotes.length === 0) {
    renderEmptyState("No release notes match your filters or search query.");
    return;
  }
  
  feedGrid.innerHTML = '';
  
  filteredNotes.forEach(note => {
    const card = document.createElement('article');
    card.className = 'card';
    
    // Set custom HSL variables for card accents based on the type
    let hueValue = '220'; // default
    if (note.type.toLowerCase() === 'feature') hueValue = 'var(--color-feature)';
    else if (note.type.toLowerCase() === 'change') hueValue = 'var(--color-change)';
    else if (note.type.toLowerCase() === 'issue') hueValue = 'var(--color-issue)';
    else if (note.type.toLowerCase() === 'breaking') hueValue = 'var(--color-breaking)';
    else if (note.type.toLowerCase() === 'announcement') hueValue = 'var(--color-announcement)';
    
    card.style.setProperty('--accent-type-color', `hsl(${hueValue})`);
    
    // Format the inner content, highlighting search query if present
    let contentHtml = note.content_html;
    if (searchQuery) {
      // Create temporary element to highlight text inside paragraph nodes only (to avoid breaking HTML tags)
      const parser = new DOMParser();
      const doc = parser.parseFromString(contentHtml, 'text/html');
      const paragraphs = doc.querySelectorAll('p, li');
      paragraphs.forEach(node => {
        node.innerHTML = highlightText(node.innerHTML, searchQuery);
      });
      contentHtml = doc.body.innerHTML;
    }
    
    const highlightedDate = searchQuery ? highlightText(note.date, searchQuery) : note.date;
    const badgeClass = `badge badge-${note.type.toLowerCase()}`;
    
    card.innerHTML = `
      <div class="card-header">
        <div class="card-meta">
          <span class="${badgeClass}">
            <span class="dot dot-${note.type.toLowerCase()}"></span>
            ${note.type}
          </span>
          <span class="card-date">${highlightedDate}</span>
        </div>
      </div>
      <div class="card-body">
        ${contentHtml}
      </div>
      <div class="card-actions">
        <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="card-btn-link">
          Official Release Notes
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
        <div class="card-action-buttons">
          <button class="btn-copy-card" data-id="${note.id}" aria-label="Copier le texte de la mise à jour">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            Copier
          </button>
          <button class="btn-tweet" data-id="${note.id}">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Tweet
          </button>
        </div>
      </div>
    `;
    
    // Attach listeners
    card.querySelector('.btn-tweet').addEventListener('click', () => openTweetModal(note));
    card.querySelector('.btn-copy-card').addEventListener('click', () => copyCardText(note));
    
    feedGrid.appendChild(card);
  });
}

// Render empty state
function renderEmptyState(message) {
  feedGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚡</div>
      <h3>No Updates Found</h3>
      <p>${message}</p>
    </div>
  `;
}

// Tweet Composer Modal Logic
function openTweetModal(note) {
  // Generate optimized default tweet text
  const tweetText = generateDefaultTweet(note);
  tweetTextarea.value = tweetText;
  
  // Update character count and progress ring
  updateCharCount();
  
  // Make main app shell inert to keyboard/screen readers (a11y guidelines)
  mainAppShell.setAttribute('inert', '');
  
  // Show standard modal
  tweetDialog.showModal();
}

function closeTweetModal() {
  tweetDialog.close();
  // Remove inert state from app shell
  mainAppShell.removeAttribute('inert');
}

// Generates a pre-filled tweet adhering to the 280-char limit
function generateDefaultTweet(note) {
  const hashTags = "#BigQuery #GoogleCloud";
  const header = `BigQuery [${note.date}] - ${note.type}: `;
  
  // Characters reserved for structure, link, and hashtags
  const reservedLen = header.length + note.link.length + hashTags.length + 5; // 5 extra for spacing/ellipses
  const allowedDescLen = 280 - reservedLen;
  
  let desc = note.content_text;
  if (desc.length > allowedDescLen) {
    desc = desc.substring(0, allowedDescLen - 3) + "...";
  }
  
  return `${header}${desc}\n\n${note.link} ${hashTags}`;
}

// Update character counting ui
function updateCharCount() {
  const currentLength = tweetTextarea.value.length;
  const remaining = 280 - currentLength;
  
  charCountText.textContent = remaining;
  
  // Character classes
  charCountText.className = 'tweet-char-count';
  if (remaining <= 20 && remaining >= 0) {
    charCountText.classList.add('warning');
  } else if (remaining < 0) {
    charCountText.classList.add('error');
  }
  
  // Progress Ring logic
  if (progressRingCircle) {
    const percentage = Math.min(Math.max(currentLength / 280, 0), 1);
    const strokeDashoffset = ringCircumference - (percentage * ringCircumference);
    progressRingCircle.style.strokeDashoffset = strokeDashoffset;
    
    // Change progress ring color dynamically
    if (remaining < 0) {
      progressRingCircle.style.stroke = '#ef4444';
    } else if (remaining <= 20) {
      progressRingCircle.style.stroke = '#fbbf24';
    } else {
      progressRingCircle.style.stroke = 'var(--primary)';
    }
  }
  
  // Toggle Tweet confirm button
  btnConfirmTweet.disabled = currentLength > 280 || currentLength === 0;
}

// Copy card content text to clipboard
async function copyCardText(note) {
  try {
    const formattedText = `BigQuery Release [${note.date}] - ${note.type}:\n${note.content_text}\n\nLink: ${note.link}`;
    await navigator.clipboard.writeText(formattedText);
    showToast('Mise à jour copiée dans le presse-papier !');
  } catch (err) {
    console.error('Failed to copy card text:', err);
    showToast('Échec de la copie du contenu.');
  }
}

// Export all release notes to CSV file
function exportAllToCSV() {
  try {
    const headers = ['ID', 'Date', 'Type', 'Content Text', 'Official Link', 'Timestamp'];
    const rows = allNotes.map(note => [
      note.id,
      note.date,
      note.type,
      note.content_text,
      note.link,
      note.timestamp
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const cleanVal = String(val || '').replace(/"/g, '""');
        return `"${cleanVal}"`;
      }).join(','))
    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const currentDate = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `bigquery_release_notes_${currentDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Toutes les données ont été exportées en CSV !');
  } catch (err) {
    console.error('Failed to export CSV:', err);
    showToast("Échec de l'exportation CSV.");
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initial load
  fetchReleaseNotes();
  
  // Refresh button action
  btnRefresh.addEventListener('click', () => {
    fetchReleaseNotes(true);
  });

  // Export CSV button action
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      if (allNotes.length === 0) {
        showToast('Aucune donnée à exporter.');
        return;
      }
      exportAllToCSV();
    });
  }
  
  // Search input filter
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyFiltersAndSearch();
  });
  
  // Category filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Clear active class
      filterButtons.forEach(b => b.classList.remove('active'));
      
      // Set active
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      applyFiltersAndSearch();
    });
  });
  
  // Dialog close button
  document.getElementById('btn-close-modal').addEventListener('click', closeTweetModal);
  
  // Handle click outside native dialog to close it (light dismiss fallback)
  tweetDialog.addEventListener('click', (e) => {
    const rect = tweetDialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && 
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && 
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      closeTweetModal();
    }
  });
  
  // Dynamic character count updating
  tweetTextarea.addEventListener('input', updateCharCount);
  
  // Copy to clipboard action
  btnCopyTweet.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(tweetTextarea.value);
      showToast('Tweet copied to clipboard!');
    } catch (err) {
      showToast('Failed to copy text.');
    }
  });
  
  // Tweet confirmation (opens Twitter/X web intent in new window)
  btnConfirmTweet.addEventListener('click', () => {
    const text = encodeURIComponent(tweetTextarea.value);
    const xIntentUrl = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(xIntentUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
  });
});
