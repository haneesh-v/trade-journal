<template>
  <div class="playbooks-page">
    <div class="page-header">
      <h1>Playbooks</h1>
      <button @click="openCreateModal" class="btn-primary">
        <span class="icon">+</span>
        Create Playbook
      </button>
    </div>

    <!-- Playbooks Grid -->
    <div v-if="playbooks.length > 0" class="playbooks-grid">
      <div
        v-for="playbook in playbooks"
        :key="playbook.id"
        class="playbook-card"
        @click="openEditModal(playbook)"
      >
        <div class="playbook-header">
          <div class="playbook-color" :style="{ backgroundColor: playbook.color }"></div>
          <h3>{{ playbook.name }}</h3>
        </div>
        <p v-if="playbook.description" class="playbook-description">
          {{ playbook.description }}
        </p>
        <div class="playbook-stats">
          <span class="stat">
            <span class="stat-value">{{ playbook.rule_count }}</span> rules
          </span>
          <span class="stat">
            <span class="stat-value">{{ playbook.trade_count }}</span> trades
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">📚</div>
      <h2>No playbooks yet</h2>
      <p>Create your first playbook to start tracking your trading rules</p>
      <button @click="openCreateModal" class="btn-primary">
        Create Your First Playbook
      </button>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ isEditing ? 'Edit Playbook' : 'Create Playbook' }}</h2>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Basic Info -->
          <div class="form-group">
            <label>Playbook Name *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g., Momentum Breakout"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea
              v-model="form.description"
              placeholder="Describe your strategy..."
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Color</label>
            <div class="color-picker">
              <div
                v-for="color in colorOptions"
                :key="color"
                :class="['color-option', { active: form.color === color }]"
                :style="{ backgroundColor: color }"
                @click="form.color = color"
              ></div>
            </div>
          </div>

          <!-- Entry Rules -->
          <div class="rules-section">
            <h3>Entry Rules</h3>
            <div
              v-for="(rule, index) in form.entry_rules"
              :key="'entry-' + index"
              class="rule-item"
            >
              <input
                v-model="form.entry_rules[index]"
                type="text"
                placeholder="Enter rule..."
                class="form-input"
              />
              <button @click="removeRule('entry', index)" class="btn-icon">
                <span>×</span>
              </button>
            </div>
            <button @click="addRule('entry')" class="btn-secondary btn-sm">
              + Add Entry Rule
            </button>
          </div>

          <!-- Exit Rules -->
          <div class="rules-section">
            <h3>Exit Rules</h3>
            <div
              v-for="(rule, index) in form.exit_rules"
              :key="'exit-' + index"
              class="rule-item"
            >
              <input
                v-model="form.exit_rules[index]"
                type="text"
                placeholder="Enter rule..."
                class="form-input"
              />
              <button @click="removeRule('exit', index)" class="btn-icon">
                <span>×</span>
              </button>
            </div>
            <button @click="addRule('exit')" class="btn-secondary btn-sm">
              + Add Exit Rule
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="isEditing"
            @click="deletePlaybook"
            class="btn-danger"
            :disabled="loading"
          >
            Delete
          </button>
          <div class="flex-grow"></div>
          <button @click="closeModal" class="btn-secondary" :disabled="loading">
            Cancel
          </button>
          <button @click="savePlaybook" class="btn-primary" :disabled="loading">
            {{ loading ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '@/services/api';

export default {
  name: 'Playbooks',
  setup() {
    const playbooks = ref([]);
    const showModal = ref(false);
    const isEditing = ref(false);
    const loading = ref(false);
    const currentPlaybookId = ref(null);

    const colorOptions = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#14B8A6', '#F97316', '#6366F1'
    ];

    const form = ref({
      name: '',
      description: '',
      color: '#3B82F6',
      entry_rules: [''],
      exit_rules: ['']
    });

    const fetchPlaybooks = async () => {
      try {
        const response = await api.get('/playbooks');
        playbooks.value = response.data;
      } catch (error) {
        console.error('Error fetching playbooks:', error);
        alert('Failed to load playbooks');
      }
    };

    const openCreateModal = () => {
      isEditing.value = false;
      currentPlaybookId.value = null;
      form.value = {
        name: '',
        description: '',
        color: '#3B82F6',
        entry_rules: [''],
        exit_rules: ['']
      };
      showModal.value = true;
    };

    const openEditModal = async (playbook) => {
      try {
        isEditing.value = true;
        currentPlaybookId.value = playbook.id;
        
        const response = await api.get(`/playbooks/${playbook.id}`);
        const data = response.data;
        
        form.value = {
          name: data.name,
          description: data.description || '',
          color: data.color || '#3B82F6',
          entry_rules: data.entry_rules.length > 0 
            ? data.entry_rules.map(r => r.rule_text)
            : [''],
          exit_rules: data.exit_rules.length > 0
            ? data.exit_rules.map(r => r.rule_text)
            : ['']
        };
        
        showModal.value = true;
      } catch (error) {
        console.error('Error fetching playbook:', error);
        alert('Failed to load playbook details');
      }
    };

    const closeModal = () => {
      showModal.value = false;
    };

    const addRule = (type) => {
      if (type === 'entry') {
        form.value.entry_rules.push('');
      } else {
        form.value.exit_rules.push('');
      }
    };

    const removeRule = (type, index) => {
      if (type === 'entry') {
        form.value.entry_rules.splice(index, 1);
        if (form.value.entry_rules.length === 0) {
          form.value.entry_rules.push('');
        }
      } else {
        form.value.exit_rules.splice(index, 1);
        if (form.value.exit_rules.length === 0) {
          form.value.exit_rules.push('');
        }
      }
    };

    const savePlaybook = async () => {
      if (!form.value.name.trim()) {
        alert('Please enter a playbook name');
        return;
      }

      loading.value = true;
      try {
        const payload = {
          name: form.value.name,
          description: form.value.description,
          color: form.value.color,
          entry_rules: form.value.entry_rules.filter(r => r.trim()),
          exit_rules: form.value.exit_rules.filter(r => r.trim())
        };

        if (isEditing.value) {
          await api.put(`/playbooks/${currentPlaybookId.value}`, payload);
        } else {
          await api.post('/playbooks', payload);
        }

        await fetchPlaybooks();
        closeModal();
      } catch (error) {
        console.error('Error saving playbook:', error);
        alert('Failed to save playbook');
      } finally {
        loading.value = false;
      }
    };

    const deletePlaybook = async () => {
      if (!confirm('Are you sure you want to delete this playbook?')) {
        return;
      }

      loading.value = true;
      try {
        await api.delete(`/playbooks/${currentPlaybookId.value}`);
        await fetchPlaybooks();
        closeModal();
      } catch (error) {
        console.error('Error deleting playbook:', error);
        alert('Failed to delete playbook');
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchPlaybooks();
    });

    return {
      playbooks,
      showModal,
      isEditing,
      loading,
      form,
      colorOptions,
      openCreateModal,
      openEditModal,
      closeModal,
      addRule,
      removeRule,
      savePlaybook,
      deletePlaybook
    };
  }
};
</script>

<style scoped>
.playbooks-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.playbooks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.playbook-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.playbook-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.playbook-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.playbook-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.playbook-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.playbook-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.playbook-stats {
  display: flex;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.stat-value {
  font-weight: 600;
  color: #111827;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #6b7280;
  margin-bottom: 2rem;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3B82F6;
}

.color-picker {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: #111827;
  box-shadow: 0 0 0 2px white, 0 0 0 4px #111827;
}

.rules-section {
  margin-top: 2rem;
}

.rules-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
}

.rule-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.rule-item .form-input {
  flex: 1;
  margin-bottom: 0;
}

.btn-icon {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  font-size: 1.5rem;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.flex-grow {
  flex: 1;
}

/* Button Styles */
.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #3B82F6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  font-size: 1.25rem;
}
</style>
