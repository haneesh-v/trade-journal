<template>
  <div class="add-trade-page">
    <div class="page-header">
      <h1>{{ isEditing ? 'Edit Trade' : 'Add Trade' }}</h1>
    </div>

    <div class="trade-form-container">
      <form @submit.prevent="saveTrade" class="trade-form">
        
        <!-- Symbol -->
        <div class="form-group">
          <label>Symbol *</label>
          <select v-model="form.symbol" required class="form-select">
            <option value="">Select symbol...</option>
            <option value="MES">MES - Micro E-mini S&P 500</option>
            <option value="MNQ">MNQ - Micro E-mini Nasdaq-100</option>
            <option value="ES">ES - E-mini S&P 500</option>
            <option value="NQ">NQ - E-mini Nasdaq-100</option>
            <option value="YM">YM - E-mini Dow</option>
            <option value="RTY">RTY - E-mini Russell 2000</option>
          </select>
        </div>

        <!-- Side -->
        <div class="form-group">
          <label>Side *</label>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" v-model="form.side" value="long" required />
              <span class="radio-label long">Long</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="form.side" value="short" required />
              <span class="radio-label short">Short</span>
            </label>
          </div>
        </div>

        <!-- Entry Time -->
        <div class="form-group">
          <label>Entry Time *</label>
          <input
            v-model="form.entryTime"
            type="datetime-local"
            required
            class="form-input"
          />
        </div>

        <!-- Entry Price -->
        <div class="form-group">
          <label>Entry Price *</label>
          <input
            v-model.number="form.entryPrice"
            type="number"
            step="0.01"
            placeholder="0.00"
            required
            class="form-input"
          />
        </div>

        <!-- Quantity -->
        <div class="form-group">
          <label>Quantity (Contracts) *</label>
          <input
            v-model.number="form.quantity"
            type="number"
            step="1"
            min="1"
            placeholder="1"
            required
            class="form-input"
          />
        </div>

        <!-- Exit Time -->
        <div class="form-group">
          <label>Exit Time</label>
          <input
            v-model="form.exitTime"
            type="datetime-local"
            class="form-input"
          />
        </div>

        <!-- Exit Price -->
        <div class="form-group">
          <label>Exit Price</label>
          <input
            v-model.number="form.exitPrice"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="form-input"
          />
        </div>

        <!-- Stop Loss -->
        <div class="form-group">
          <label>Stop Loss</label>
          <input
            v-model.number="form.stopLoss"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="form-input"
          />
        </div>

        <!-- Take Profit -->
        <div class="form-group">
          <label>Take Profit</label>
          <input
            v-model.number="form.takeProfit"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="form-input"
          />
        </div>

        <!-- Commission -->
        <div class="form-group">
          <label>Commission</label>
          <input
            v-model.number="form.commission"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="form-input"
          />
        </div>

        <!-- Fees -->
        <div class="form-group">
          <label>Fees</label>
          <input
            v-model.number="form.fees"
            type="number"
            step="0.01"
            placeholder="0.00"
            class="form-input"
          />
        </div>

        <!-- Notes -->
        <div class="form-group full-width">
          <label>Notes</label>
          <textarea
            v-model="form.notes"
            placeholder="Add any notes about this trade..."
            rows="4"
            class="form-textarea"
          ></textarea>
        </div>

        <!-- Calculated P&L Display -->
        <div v-if="calculatedPnL !== null" class="pnl-display">
          <div class="pnl-label">Estimated P&L:</div>
          <div :class="['pnl-value', calculatedPnL >= 0 ? 'positive' : 'negative']">
            {{ calculatedPnL >= 0 ? '+' : '' }}${{ calculatedPnL.toFixed(2) }}
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" @click="cancel" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" :disabled="loading" class="btn-primary">
            {{ loading ? 'Saving...' : (isEditing ? 'Update Trade' : 'Add Trade') }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '@/services/api';

export default {
  name: 'SimplifiedAddTrade',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const loading = ref(false);
    const isEditing = ref(false);

    const form = ref({
      symbol: '',
      side: 'long',
      entryTime: '',
      entryPrice: null,
      quantity: 1,
      exitTime: '',
      exitPrice: null,
      stopLoss: null,
      takeProfit: null,
      commission: 0,
      fees: 0,
      notes: ''
    });

    // Futures contract specifications
    const contractSpecs = {
      MES: { pointValue: 5, tickSize: 0.25 },
      MNQ: { pointValue: 2, tickSize: 0.25 },
      ES: { pointValue: 50, tickSize: 0.25 },
      NQ: { pointValue: 20, tickSize: 0.25 },
      YM: { pointValue: 5, tickSize: 1 },
      RTY: { pointValue: 50, tickSize: 0.1 }
    };

    // Calculate P&L
    const calculatedPnL = computed(() => {
      if (!form.value.entryPrice || !form.value.exitPrice || !form.value.symbol) {
        return null;
      }

      const spec = contractSpecs[form.value.symbol];
      if (!spec) return null;

      const priceDiff = form.value.side === 'long'
        ? (form.value.exitPrice - form.value.entryPrice)
        : (form.value.entryPrice - form.value.exitPrice);

      const grossPnL = priceDiff * spec.pointValue * form.value.quantity;
      const netPnL = grossPnL - (form.value.commission || 0) - (form.value.fees || 0);

      return netPnL;
    });

    const saveTrade = async () => {
      loading.value = true;
      try {
        // Format data for backend (use camelCase as expected by backend)
        const payload = {
          symbol: form.value.symbol,
          side: form.value.side,
          quantity: form.value.quantity,
          entryPrice: form.value.entryPrice,
          exitPrice: form.value.exitPrice || null,
          entryTime: form.value.entryTime,
          exitTime: form.value.exitTime || null,
          stopLoss: form.value.stopLoss || null,
          takeProfit: form.value.takeProfit || null,
          commission: form.value.commission || 0,
          fees: form.value.fees || 0,
          notes: form.value.notes || '',
          instrumentType: 'future'
          // tradeDate removed - backend extracts it from entryTime
        };
    
        // Calculate P&L if exit price exists
        if (form.value.exitPrice) {
          const spec = contractSpecs[form.value.symbol];
          if (spec) {
            const priceDiff = form.value.side === 'long'
              ? (form.value.exitPrice - form.value.entryPrice)
              : (form.value.entryPrice - form.value.exitPrice);
            
            const grossPnL = priceDiff * spec.pointValue * form.value.quantity;
            payload.pnl = grossPnL - payload.commission - payload.fees;
            payload.pnlPercent = (payload.pnl / (form.value.entryPrice * spec.pointValue * form.value.quantity)) * 100;
          }
        }
    
        if (isEditing.value) {
          await api.put(`/trades/${route.params.id}`, payload);
        } else {
          await api.post('/trades', payload);
        }
    
        router.push('/trades');
      } catch (error) {
        console.error('Error saving trade:', error);
        alert('Failed to save trade: ' + (error.response?.data?.error || error.message));
      } finally {
        loading.value = false;
      }
    };

    const cancel = () => {
      router.push('/trades');
    };

    const loadTrade = async () => {
      if (!route.params.id) return;
      
      isEditing.value = true;
      loading.value = true;
      
      try {
        const response = await api.get(`/trades/${route.params.id}`);
        const trade = response.data;
        
        form.value = {
          symbol: trade.symbol,
          side: trade.side,
          entryTime: trade.entry_time ? trade.entry_time.slice(0, 16) : '',
          entryPrice: trade.entry_price,
          quantity: trade.quantity,
          exitTime: trade.exit_time ? trade.exit_time.slice(0, 16) : '',
          exitPrice: trade.exit_price,
          stopLoss: trade.stop_loss,
          takeProfit: trade.take_profit,
          commission: trade.commission || 0,
          fees: trade.fees || 0,
          notes: trade.notes || ''
        };
      } catch (error) {
        console.error('Error loading trade:', error);
        alert('Failed to load trade');
        router.push('/trades');
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      if (route.params.id) {
        loadTrade();
      } else {
        // Set default entry time to now
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        form.value.entryTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    });

    return {
      form,
      loading,
      isEditing,
      calculatedPnL,
      saveTrade,
      cancel
    };
  }
};
</script>

<style scoped>
.add-trade-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.trade-form-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
}

.trade-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-option {
  flex: 1;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  display: none;
}

.radio-label {
  display: block;
  padding: 0.75rem;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
  transition: all 0.2s;
}

.radio-option input[type="radio"]:checked + .radio-label {
  border-color: #3B82F6;
  background: #eff6ff;
  color: #1e40af;
}

.radio-label.long {
  color: #059669;
}

.radio-option input[type="radio"]:checked + .radio-label.long {
  border-color: #059669;
  background: #d1fae5;
  color: #065f46;
}

.radio-label.short {
  color: #dc2626;
}

.radio-option input[type="radio"]:checked + .radio-label.short {
  border-color: #dc2626;
  background: #fee2e2;
  color: #991b1b;
}

.pnl-display {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-top: 1rem;
}

.pnl-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.pnl-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.pnl-value.positive {
  color: #059669;
}

.pnl-value.negative {
  color: #dc2626;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #3B82F6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
}

@media (max-width: 768px) {
  .trade-form {
    grid-template-columns: 1fr;
  }
  
  .add-trade-page {
    padding: 1rem;
  }
  
  .trade-form-container {
    padding: 1rem;
  }
}
</style>
