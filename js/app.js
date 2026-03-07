(function () {
    'use strict';

    const STORAGE_KEY = 'joc_submittals';

    // DOM elements
    const submittalBody = document.getElementById('submittalBody');
    const emptyState = document.getElementById('emptyState');
    const modalOverlay = document.getElementById('modalOverlay');
    const detailOverlay = document.getElementById('detailOverlay');
    const submittalForm = document.getElementById('submittalForm');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortSelect = document.getElementById('sortSelect');

    // State
    let submittals = loadSubmittals();

    // Load from localStorage
    function loadSubmittals() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveSubmittals() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(submittals));
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // Status display helpers
    const statusLabels = {
        'pending': 'Pending',
        'submitted': 'Submitted',
        'under-review': 'Under Review',
        'approved': 'Approved',
        'approved-as-noted': 'Approved as Noted',
        'rejected': 'Rejected',
        'resubmit': 'Resubmit'
    };

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function isOverdue(dateRequired, status) {
        if (!dateRequired || status === 'approved' || status === 'approved-as-noted') return false;
        return new Date(dateRequired + 'T00:00:00') < new Date();
    }

    // Render the table
    function render() {
        const filtered = getFilteredSubmittals();
        submittalBody.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.style.display = 'block';
            document.querySelector('.submittal-table').style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            document.querySelector('.submittal-table').style.display = 'table';

            filtered.forEach(function (s) {
                const tr = document.createElement('tr');
                const overdue = isOverdue(s.dateRequired, s.status);
                tr.innerHTML =
                    '<td><strong>' + escapeHtml(s.submittalNumber) + '</strong></td>' +
                    '<td>' + escapeHtml(s.jocNumber) + '</td>' +
                    '<td>' + escapeHtml(s.description) + '</td>' +
                    '<td>' + escapeHtml(s.specSection || '—') + '</td>' +
                    '<td>' + escapeHtml(s.submittedBy) + '</td>' +
                    '<td>' + formatDate(s.dateSubmitted) + '</td>' +
                    '<td class="' + (overdue ? 'overdue' : '') + '">' + formatDate(s.dateRequired) + (overdue ? ' (overdue)' : '') + '</td>' +
                    '<td><span class="badge badge-' + s.status + '">' + statusLabels[s.status] + '</span></td>' +
                    '<td>' +
                        '<button class="btn-icon edit-btn" data-id="' + s.id + '" title="Edit">&#9998;</button> ' +
                        '<button class="btn-icon delete-btn" data-id="' + s.id + '" title="Delete">&#128465;</button>' +
                    '</td>';
                tr.addEventListener('click', function (e) {
                    if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
                    showDetail(s.id);
                });
                submittalBody.appendChild(tr);
            });
        }

        updateStats();
    }

    function getFilteredSubmittals() {
        var query = searchInput.value.toLowerCase();
        var statusVal = statusFilter.value;
        var sortVal = sortSelect.value;

        var result = submittals.filter(function (s) {
            var matchesSearch = !query ||
                s.submittalNumber.toLowerCase().includes(query) ||
                s.jocNumber.toLowerCase().includes(query) ||
                s.description.toLowerCase().includes(query) ||
                s.submittedBy.toLowerCase().includes(query) ||
                (s.specSection && s.specSection.toLowerCase().includes(query));
            var matchesStatus = statusVal === 'all' || s.status === statusVal;
            return matchesSearch && matchesStatus;
        });

        result.sort(function (a, b) {
            switch (sortVal) {
                case 'date-desc': return (b.dateSubmitted || '').localeCompare(a.dateSubmitted || '');
                case 'date-asc': return (a.dateSubmitted || '').localeCompare(b.dateSubmitted || '');
                case 'number': return a.submittalNumber.localeCompare(b.submittalNumber);
                case 'status': return a.status.localeCompare(b.status);
                default: return 0;
            }
        });

        return result;
    }

    function updateStats() {
        document.querySelector('#statTotal .stat-value').textContent = submittals.length;
        document.querySelector('#statPending .stat-value').textContent = submittals.filter(function (s) { return s.status === 'pending' || s.status === 'submitted'; }).length;
        document.querySelector('#statReview .stat-value').textContent = submittals.filter(function (s) { return s.status === 'under-review'; }).length;
        document.querySelector('#statApproved .stat-value').textContent = submittals.filter(function (s) { return s.status === 'approved' || s.status === 'approved-as-noted'; }).length;
        document.querySelector('#statRejected .stat-value').textContent = submittals.filter(function (s) { return s.status === 'rejected' || s.status === 'resubmit'; }).length;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Modal management
    function openModal(submittal) {
        document.getElementById('modalTitle').textContent = submittal ? 'Edit Submittal' : 'New Submittal';
        submittalForm.reset();

        if (submittal) {
            document.getElementById('submittalId').value = submittal.id;
            document.getElementById('submittalNumber').value = submittal.submittalNumber;
            document.getElementById('jocNumber').value = submittal.jocNumber;
            document.getElementById('description').value = submittal.description;
            document.getElementById('specSection').value = submittal.specSection || '';
            document.getElementById('submittedBy').value = submittal.submittedBy;
            document.getElementById('dateSubmitted').value = submittal.dateSubmitted;
            document.getElementById('dateRequired').value = submittal.dateRequired || '';
            document.getElementById('status').value = submittal.status;
            document.getElementById('reviewer').value = submittal.reviewer || '';
            document.getElementById('notes').value = submittal.notes || '';
        } else {
            document.getElementById('submittalId').value = '';
            document.getElementById('dateSubmitted').value = new Date().toISOString().split('T')[0];
        }

        modalOverlay.classList.add('active');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
    }

    function showDetail(id) {
        var s = submittals.find(function (x) { return x.id === id; });
        if (!s) return;

        document.getElementById('detailTitle').textContent = 'Submittal ' + s.submittalNumber;
        var overdue = isOverdue(s.dateRequired, s.status);

        document.getElementById('detailContent').innerHTML =
            '<div class="detail-row"><span class="detail-label">Submittal #</span><span class="detail-value">' + escapeHtml(s.submittalNumber) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">JOC #</span><span class="detail-value">' + escapeHtml(s.jocNumber) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">' + escapeHtml(s.description) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Spec Section</span><span class="detail-value">' + escapeHtml(s.specSection || '—') + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Submitted By</span><span class="detail-value">' + escapeHtml(s.submittedBy) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Date Submitted</span><span class="detail-value">' + formatDate(s.dateSubmitted) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Date Required</span><span class="detail-value' + (overdue ? ' overdue' : '') + '">' + formatDate(s.dateRequired) + (overdue ? ' (OVERDUE)' : '') + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="badge badge-' + s.status + '">' + statusLabels[s.status] + '</span></span></div>' +
            '<div class="detail-row"><span class="detail-label">Reviewer</span><span class="detail-value">' + escapeHtml(s.reviewer || '—') + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">' + escapeHtml(s.notes || '—') + '</span></div>';

        document.getElementById('detailEditBtn').onclick = function () {
            detailOverlay.classList.remove('active');
            openModal(s);
        };

        detailOverlay.classList.add('active');
    }

    // Event listeners
    document.getElementById('addSubmittalBtn').addEventListener('click', function () {
        openModal(null);
    });

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('detailClose').addEventListener('click', function () {
        detailOverlay.classList.remove('active');
    });
    document.getElementById('detailCloseBtn').addEventListener('click', function () {
        detailOverlay.classList.remove('active');
    });

    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) closeModal();
    });
    detailOverlay.addEventListener('click', function (e) {
        if (e.target === detailOverlay) detailOverlay.classList.remove('active');
    });

    searchInput.addEventListener('input', render);
    statusFilter.addEventListener('change', render);
    sortSelect.addEventListener('change', render);

    // Form submission
    submittalForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var id = document.getElementById('submittalId').value;
        var data = {
            submittalNumber: document.getElementById('submittalNumber').value.trim(),
            jocNumber: document.getElementById('jocNumber').value.trim(),
            description: document.getElementById('description').value.trim(),
            specSection: document.getElementById('specSection').value.trim(),
            submittedBy: document.getElementById('submittedBy').value.trim(),
            dateSubmitted: document.getElementById('dateSubmitted').value,
            dateRequired: document.getElementById('dateRequired').value,
            status: document.getElementById('status').value,
            reviewer: document.getElementById('reviewer').value.trim(),
            notes: document.getElementById('notes').value.trim()
        };

        if (id) {
            var idx = submittals.findIndex(function (s) { return s.id === id; });
            if (idx !== -1) {
                submittals[idx] = Object.assign({}, submittals[idx], data);
            }
        } else {
            data.id = generateId();
            data.createdAt = new Date().toISOString();
            submittals.push(data);
        }

        saveSubmittals();
        closeModal();
        render();
    });

    // Delete handler (delegated)
    submittalBody.addEventListener('click', function (e) {
        var deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            var id = deleteBtn.dataset.id;
            if (confirm('Delete this submittal?')) {
                submittals = submittals.filter(function (s) { return s.id !== id; });
                saveSubmittals();
                render();
            }
        }

        var editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            e.stopPropagation();
            var editId = editBtn.dataset.id;
            var sub = submittals.find(function (s) { return s.id === editId; });
            if (sub) openModal(sub);
        }
    });

    // Initial render
    render();
})();
